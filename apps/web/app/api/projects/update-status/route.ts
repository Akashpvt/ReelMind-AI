import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";
import { clientProjectUrl, sendStatusUpdateEmail } from "@/lib/email/send-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotificationsForUsers, notifyProjectClient } from "@/lib/team/notifications";
import { isWorkflowProjectStatus, statusLabel } from "@/lib/team/project-types";
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
  const status = typeof body.status === "string" ? body.status : "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  if (!isWorkflowProjectStatus(status)) {
    return NextResponse.json({ error: "Invalid workflow status." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: existingProject, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id,project_title,client_email,status")
    .eq("id", projectId)
    .single();

  if (projectError || !existingProject) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, existingProject.organization_id);
  if (!activeTeam || !canManageClientProjects(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to update project workflow." }, { status: 403 });
  }

  const previousStatus = String(existingProject.status);
  const { data: project, error } = await adminSupabase
    .from("client_projects")
    .update({ status })
    .eq("id", projectId)
    .select("id,organization_id,client_name,client_email,client_phone,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const message = `Project moved from ${previousStatus.toUpperCase()} to ${status.toUpperCase()}`;
  await adminSupabase.from("project_activity_logs").insert({
    organization_id: existingProject.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "project_status_moved",
    metadata: {
      message,
      fromStatus: previousStatus,
      toStatus: status,
      fromLabel: statusLabel(previousStatus),
      toLabel: statusLabel(status),
      projectTitle: existingProject.project_title,
    },
  });

  const recipients = [project.assigned_member_id, project.assigned_to].filter(Boolean) as string[];
  await createNotificationsForUsers({
    organizationId: existingProject.organization_id,
    projectId,
    userIds: recipients,
    type: "project_status_changed",
    title: "Project status changed",
    message,
  });
  await notifyProjectClient({
    organizationId: existingProject.organization_id,
    projectId,
    type: "project_status_changed",
    title: "Project status updated",
    message,
  });
  await sendStatusUpdateEmail({
    organizationId: existingProject.organization_id,
    projectId,
    to: project.client_email,
    projectTitle: existingProject.project_title,
    previousStatus,
    newStatus: status,
    projectUrl: await clientProjectUrl(projectId),
  });

  await dispatchWorkflowTrigger(existingProject.organization_id, "status_changed", { userId: user.id, projectId, projectTitle: existingProject.project_title, clientEmail: project.client_email, assignedUserId: project.assigned_to ?? undefined, fromStatus: previousStatus, toStatus: status });
  if(status==="review")await notifyWhatsAppEvent(existingProject.organization_id,"review_requested",{phone:project.client_phone,projectId,name:project.client_name,projectTitle:project.project_title});
  return NextResponse.json({ success: true, project });
}
