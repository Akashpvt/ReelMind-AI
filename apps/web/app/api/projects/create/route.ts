import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { assertWithinPlanLimit } from "@/lib/billing/subscription";
import { isProjectPriority, canManageClientProjects } from "@/lib/team/project-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const requestedOrganizationId = typeof body.organizationId === "string" ? body.organizationId : null;
  const activeTeam = await resolveActiveTeam(user.id, requestedOrganizationId);
  const organizationIdUsed = activeTeam?.organization.id ?? requestedOrganizationId;
  const [currentOrgRoleResult, ownerFallbackResult] = organizationIdUsed
    ? await Promise.all([
        supabase.rpc("current_org_role", { target_organization_id: organizationIdUsed }),
        supabase
          .from("organizations")
          .select("id,owner_id")
          .eq("id", organizationIdUsed)
          .eq("owner_id", user.id)
          .maybeSingle(),
      ])
    : [
        { data: null, error: null },
        { data: null, error: null },
      ];

  console.info("[api/projects/create] auth and organization debug", {
    authenticatedUserId: user.id,
    requestedOrganizationId,
    organizationIdUsed,
    currentOrgRoleResult: {
      data: currentOrgRoleResult.data,
      error: currentOrgRoleResult.error,
    },
    ownerFallbackResult: {
      data: ownerFallbackResult.data,
      error: ownerFallbackResult.error,
      isOwner: Boolean(ownerFallbackResult.data),
    },
    activeTeam: activeTeam
      ? {
          organizationId: activeTeam.organization.id,
          membershipRole: activeTeam.membership.role,
          membershipId: activeTeam.membership.id,
        }
      : null,
  });

  if (!activeTeam) {
    return NextResponse.json({
      error: "Create or join an organization before creating projects.",
      failingCondition: "active_team_not_resolved",
    }, { status: 400 });
  }

  if (!canManageClientProjects(activeTeam.membership.role)) {
    return NextResponse.json({
      error: "Only owners, admins, managers, and editors can create projects.",
      failingCondition: "membership_role_cannot_manage_client_projects",
    }, { status: 403 });
  }

  const limitCheck = await assertWithinPlanLimit(activeTeam.organization.id, "projects");
  if (!limitCheck.ok) {
    return NextResponse.json({
      error: limitCheck.error,
      failingCondition: "project_plan_limit_reached",
      upgradeRequired: true,
    }, { status: 402 });
  }

  const clientName = typeof body.clientName === "string" ? body.clientName.trim() : "";
  const clientEmail = typeof body.clientEmail === "string" && body.clientEmail.trim() ? body.clientEmail.trim().toLowerCase() : null;
  const clientPhone = typeof body.clientPhone === "string" && body.clientPhone.trim() ? body.clientPhone.trim() : null;
  const projectTitle = typeof body.projectTitle === "string" ? body.projectTitle.trim() : "";
  const projectDescription = typeof body.projectDescription === "string" && body.projectDescription.trim() ? body.projectDescription.trim() : null;
  const priority = isProjectPriority(body.priority) ? body.priority : "medium";
  const budget = typeof body.budget === "number" && Number.isFinite(body.budget) ? body.budget : Number(body.budget ?? 0) || 0;
  const deadline = typeof body.deadline === "string" && body.deadline ? new Date(body.deadline).toISOString() : null;

  if (!clientName || !projectTitle) {
    return NextResponse.json({
      error: "Client name and project title are required.",
      failingCondition: "missing_client_name_or_project_title",
    }, { status: 400 });
  }
  const insertPayload = {
    organization_id: activeTeam.organization.id,
    client_name: clientName,
    client_email: clientEmail,
    client_phone: clientPhone,
    project_title: projectTitle,
    project_description: projectDescription,
    status: "brief",
    priority,
    budget,
    deadline,
    created_by: user.id,
  };

  console.info("[api/projects/create] insert payload", insertPayload);

  const adminSupabase = createAdminClient();
  const { data: project, error } = await adminSupabase
    .from("client_projects")
    .insert(insertPayload)
    .select("id,organization_id,client_name,client_email,client_phone,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .single();

  console.info("[api/projects/create] admin insert result", {
    usingAdminSupabase: true,
    insertResult: project,
    insertError: error,
  });

  if (error) {
    console.error("[api/projects/create] Supabase insert error", {
      usingAdminSupabase: true,
      authenticatedUserId: user.id,
      organizationIdUsed: activeTeam.organization.id,
      currentOrgRoleResult: {
        data: currentOrgRoleResult.data,
        error: currentOrgRoleResult.error,
      },
      ownerFallbackResult: {
        data: ownerFallbackResult.data,
        error: ownerFallbackResult.error,
        isOwner: Boolean(ownerFallbackResult.data),
      },
      insertPayload,
      insertResult: project,
      insertError: error,
    });

    return NextResponse.json({
      error: error.message,
      failingCondition: "client_projects_insert_failed",
    }, { status: 400 });
  }

  await supabase.from("project_activity_logs").insert({
    organization_id: activeTeam.organization.id,
    project_id: project.id,
    user_id: user.id,
    action: "project_created",
    metadata: { projectTitle, clientName },
  });

  await dispatchWorkflowTrigger(activeTeam.organization.id, "project_created", { userId: user.id, projectId: project.id, projectTitle, clientEmail: clientEmail ?? undefined, clientName, status: project.status });
  return NextResponse.json({ success: true, project });
}
