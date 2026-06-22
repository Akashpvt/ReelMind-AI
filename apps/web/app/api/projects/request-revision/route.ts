import { NextResponse } from "next/server";
import { clientProjectUrl, sendRevisionRequestEmail } from "@/lib/email/send-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyProjectClient } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { canManageClientProjects } from "@/lib/team/project-types";

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
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: existingProject, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id,project_title,status")
    .eq("id", projectId)
    .single();

  if (projectError || !existingProject) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, existingProject.organization_id);
  if (!activeTeam || !canManageClientProjects(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to request revisions." }, { status: 403 });
  }

  const previousStatus = String(existingProject.status);
  if (previousStatus !== "review") {
    return NextResponse.json({ error: "Only projects in review can receive revision requests." }, { status: 400 });
  }

  const newStatus = "revision_requested";
  const { data: project, error } = await adminSupabase
    .from("client_projects")
    .update({ status: newStatus })
    .eq("id", projectId)
    .select("id,organization_id,client_name,client_email,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: existingProject.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "revision_requested",
    metadata: {
      projectTitle: existingProject.project_title,
      previousStatus,
      newStatus,
    },
  });

  await notifyProjectClient({
    organizationId: existingProject.organization_id,
    projectId,
    type: "project_status_changed",
    title: "Revision requested",
    message: `${existingProject.project_title} moved from review to revision requested.`,
  });
  await sendRevisionRequestEmail({
    organizationId: existingProject.organization_id,
    projectId,
    to: project.client_email,
    projectTitle: existingProject.project_title,
    projectUrl: await clientProjectUrl(projectId),
  });

  return NextResponse.json({ success: true, project });
}
