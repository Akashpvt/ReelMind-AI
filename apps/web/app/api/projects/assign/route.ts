import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";
import { agencyProjectUrl, sendProjectAssignedEmail } from "@/lib/email/send-email";
import { canManageClientProjects } from "@/lib/team/project-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OrganizationMemberDebugRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
};

const uuidPattern = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const fallbackMemberIdRegex = new RegExp(`^(${uuidPattern})-(${uuidPattern})$`);

function extractFallbackUserId(memberId: string, organizationId: string) {
  const match = memberId.match(fallbackMemberIdRegex);
  if (!match) return null;
  const [, fallbackOrganizationId, fallbackUserId] = match;
  return fallbackOrganizationId === organizationId ? fallbackUserId : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const memberId = typeof body.memberId === "string" && body.memberId ? body.memberId : typeof body.assignedTo === "string" && body.assignedTo ? body.assignedTo : null;

  console.info("[api/projects/assign] received", { projectId, memberId });

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: existingProject, error: existingError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id")
    .eq("id", projectId)
    .single();

  if (existingError || !existingProject) {
    return NextResponse.json({ error: existingError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, existingProject.organization_id);
  if (!activeTeam || !canManageClientProjects(activeTeam.membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, managers, and editors can assign projects." }, { status: 403 });
  }

  const { data: organizationMembers } = await adminSupabase
    .from("organization_members")
    .select("id,organization_id,user_id,role,status")
    .eq("organization_id", existingProject.organization_id)
    .order("joined_at", { ascending: true });
  const activeOrganizationMembers = ((organizationMembers ?? []) as OrganizationMemberDebugRow[]).filter((member) => member.status === "active");

  console.info("[api/projects/assign] active organization members", {
    organizationId: existingProject.organization_id,
    allMemberIds: activeOrganizationMembers.map((member) => member.id),
    membershipIds: activeOrganizationMembers.map((member) => member.id),
    userIds: activeOrganizationMembers.map((member) => member.user_id),
    rows: activeOrganizationMembers.map((member) => ({
      id: member.id,
      organization_id: member.organization_id,
      user_id: member.user_id,
      role: member.role,
      status: member.status,
    })),
  });

  let assignedMemberName: string | null = null;
  let assignedMemberRole: string | null = null;
  let assignedMemberEmail: string | null = null;
  let assignedUserId: string | null = null;
  let resolvedMembershipId: string | null = null;
  let resolutionMode: "organization_members.id" | "auth.users.id" | "computed_fallback_user_id" | "unknown" = "unknown";
  if (memberId) {
    const fallbackUserId = extractFallbackUserId(memberId, existingProject.organization_id);
    const { data: membershipById } = await adminSupabase
      .from("organization_members")
      .select("id,organization_id,user_id,role,status")
      .eq("id", memberId)
      .eq("organization_id", existingProject.organization_id)
      .maybeSingle();
    const { data: membershipByUserId } = await adminSupabase
      .from("organization_members")
      .select("id,organization_id,user_id,role,status")
      .eq("organization_id", existingProject.organization_id)
      .eq("user_id", memberId)
      .maybeSingle();
    const { data: membershipByFallbackUserId } = fallbackUserId
      ? await adminSupabase
          .from("organization_members")
          .select("id,organization_id,user_id,role,status")
          .eq("organization_id", existingProject.organization_id)
          .eq("user_id", fallbackUserId)
          .maybeSingle()
      : { data: null };
    const assignee = ((membershipById ?? membershipByUserId ?? membershipByFallbackUserId) as OrganizationMemberDebugRow | null) ?? null;
    resolutionMode = membershipById
      ? "organization_members.id"
      : membershipByUserId
        ? "auth.users.id"
        : membershipByFallbackUserId
          ? "computed_fallback_user_id"
          : "unknown";
    resolvedMembershipId = assignee?.id ?? null;
    assignedUserId = assignee?.user_id ?? null;

    console.info("[api/projects/assign] selected member lookup", {
      receivedMemberId: memberId,
      resolvedUserId: assignedUserId,
      resolvedMembershipId,
      resolutionMode,
      returnedRow: assignee,
      membershipById,
      membershipByUserId,
      membershipByFallbackUserId,
      fallbackUserId,
      organization_id: assignee?.organization_id ?? null,
      user_id: assignee?.user_id ?? null,
      role: assignee?.role ?? null,
      status: assignee?.status ?? null,
    });

    if (!assignee || assignee.status !== "active") {
      return NextResponse.json({
        error: `Unable to assign project: memberId "${memberId}" did not resolve to an active organization member for organization "${existingProject.organization_id}".`,
        details: {
          receivedMemberId: memberId,
          resolvedUserId: assignedUserId,
          resolvedMembershipId,
          resolutionMode,
          projectId,
          organizationId: existingProject.organization_id,
          membershipById,
          membershipByUserId,
          membershipByFallbackUserId,
          fallbackUserId,
          activeMembershipIds: activeOrganizationMembers.map((member) => member.id),
          activeUserIds: activeOrganizationMembers.map((member) => member.user_id),
        },
      }, { status: 400 });
    }

    const resolvedUserId = assignee.user_id;
    assignedUserId = resolvedUserId;
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("email,full_name")
      .eq("id", resolvedUserId)
      .maybeSingle();
    assignedMemberName = profile?.full_name || profile?.email || resolvedUserId.slice(0, 8);
    assignedMemberEmail = profile?.email ?? null;
    assignedMemberRole = assignee.role;
  }

  const assignmentUpdate = {
    assigned_to: assignedUserId,
    assigned_member_id: assignedUserId,
    assigned_member_name: assignedMemberName,
  };

  const { data: project, error } = await adminSupabase
    .from("client_projects")
    .update(assignmentUpdate)
    .eq("id", projectId)
    .select("id,organization_id,client_name,client_email,client_phone,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("project_activity_logs").insert({
    organization_id: existingProject.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "project_assigned",
    metadata: {
      memberId,
      resolutionMode,
      resolvedMembershipId,
      assignedUserId,
      assignedMemberName,
      assignedMemberRole,
      projectTitle: project.project_title,
    },
  });

  if (assignedUserId) {
    await createNotification({
      organizationId: existingProject.organization_id,
      projectId,
      userId: assignedUserId,
      type: "project_assigned",
      title: "Project assigned",
      message: `${project.project_title} was assigned to you.`,
    });
    await sendProjectAssignedEmail({
      organizationId: existingProject.organization_id,
      projectId,
      to: assignedMemberEmail,
      projectTitle: project.project_title,
      memberName: assignedMemberName,
      projectUrl: agencyProjectUrl(projectId),
    });
  }

  await dispatchWorkflowTrigger(existingProject.organization_id, "project_assigned", { userId: user.id, projectId, projectTitle: project.project_title, assignedUserId: assignedUserId ?? undefined, assignedEmail: assignedMemberEmail ?? undefined, assignedMemberId: resolvedMembershipId ?? memberId ?? undefined, clientEmail: project.client_email });
  await notifyWhatsAppEvent(existingProject.organization_id,"project_assigned",{phone:project.client_phone,projectId,name:project.client_name,projectTitle:project.project_title});
  return NextResponse.json({ success: true, project });
}
