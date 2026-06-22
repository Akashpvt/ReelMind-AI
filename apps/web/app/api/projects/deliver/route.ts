import { NextResponse } from "next/server";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";
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
    return NextResponse.json({ error: "User must be an active organization member to deliver projects." }, { status: 403 });
  }

  const previousStatus = String(existingProject.status);
  if (previousStatus !== "approved") {
    return NextResponse.json({ error: "Only approved projects can be delivered." }, { status: 400 });
  }

  const newStatus = "delivered";
  const { data: project, error } = await adminSupabase
    .from("client_projects")
    .update({ status: newStatus })
    .eq("id", projectId)
    .select("id,organization_id,client_name,client_email,client_phone,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: existingProject.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "project_delivered",
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
    title: "Project delivered",
    message: `${existingProject.project_title} has been delivered.`,
  });
  await notifyWhatsAppEvent(existingProject.organization_id,"project_delivered",{phone:project.client_phone,projectId,name:project.client_name,projectTitle:project.project_title});

  return NextResponse.json({ success: true, project });
}
