import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyActiveOrganizationMembers, notifyProjectClient } from "@/lib/team/notifications";

export const runtime = "nodejs";

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const adminSupabase = createAdminClient();
  const { data: access, error: accessError } = await adminSupabase
    .from("client_project_access")
    .select("id,organization_id,project_id,client_email,status,expires_at")
    .eq("access_token", token)
    .single();

  if (accessError || !access || access.status !== "active" || isExpired(access.expires_at)) {
    return NextResponse.json({ error: "Client portal link is invalid or expired." }, { status: 404 });
  }

  const { data: existingProject, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id,client_name,client_phone,project_title,status")
    .eq("id", access.project_id)
    .single();

  if (projectError || !existingProject) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  if (existingProject.status !== "review") {
    return NextResponse.json({ error: "Only projects in review can be approved." }, { status: 400 });
  }

  const previousStatus = String(existingProject.status);
  const newStatus = "approved";
  const { data: project, error } = await adminSupabase
    .from("client_projects")
    .update({ status: newStatus })
    .eq("id", access.project_id)
    .select("id,project_title,status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: access.organization_id,
    project_id: access.project_id,
    user_id: null,
    action: "client_approved_project",
    metadata: {
      projectTitle: existingProject.project_title,
      previousStatus,
      newStatus,
      clientEmail: access.client_email,
    },
  });

  await notifyActiveOrganizationMembers({
    organizationId: access.organization_id,
    projectId: access.project_id,
    type: "client_approved",
    title: "Client approved project",
    message: `${existingProject.project_title} was approved by ${access.client_email}.`,
  });
  await notifyProjectClient({
    organizationId: access.organization_id,
    projectId: access.project_id,
    type: "client_approved",
    title: "Project approved",
    message: `${existingProject.project_title} has been approved.`,
  });

  await dispatchWorkflowTrigger(access.organization_id, "client_approved", { projectId: access.project_id, projectTitle: existingProject.project_title, clientEmail: access.client_email, fromStatus: previousStatus, toStatus: newStatus });
  await notifyWhatsAppEvent(access.organization_id,"project_approved",{phone:existingProject.client_phone,projectId:access.project_id,name:existingProject.client_name,projectTitle:existingProject.project_title});
  return NextResponse.json({ success: true, project });
}
