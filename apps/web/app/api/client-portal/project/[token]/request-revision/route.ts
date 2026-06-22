import { NextResponse } from "next/server";
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
    .select("id,organization_id,project_title,status")
    .eq("id", access.project_id)
    .single();

  if (projectError || !existingProject) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  if (existingProject.status !== "review") {
    return NextResponse.json({ error: "Only projects in review can receive revision requests." }, { status: 400 });
  }

  const previousStatus = String(existingProject.status);
  const newStatus = "revision_requested";
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
    action: "client_requested_revision",
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
    type: "client_requested_revision",
    title: "Client requested revision",
    message: `${existingProject.project_title} needs revisions from ${access.client_email}.`,
  });
  await notifyProjectClient({
    organizationId: access.organization_id,
    projectId: access.project_id,
    type: "client_requested_revision",
    title: "Revision requested",
    message: `Revision request recorded for ${existingProject.project_title}.`,
  });

  return NextResponse.json({ success: true, project });
}
