import { NextResponse } from "next/server";
import { canManageClientProjects, isProjectPriority, isProjectStatus } from "@/lib/team/project-types";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
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

  const { data: existingProject, error: existingError } = await supabase
    .from("client_projects")
    .select("id,organization_id,status,project_title")
    .eq("id", projectId)
    .single();

  if (existingError || !existingProject) {
    return NextResponse.json({ error: existingError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, existingProject.organization_id);
  if (!activeTeam || !canManageClientProjects(activeTeam.membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, managers, and editors can update projects." }, { status: 403 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.clientName === "string") update.client_name = body.clientName.trim();
  if (typeof body.clientEmail === "string") update.client_email = body.clientEmail.trim() ? body.clientEmail.trim().toLowerCase() : null;
  if (typeof body.projectTitle === "string") {
    update.project_title = body.projectTitle.trim();
  }
  if (typeof body.projectDescription === "string") update.project_description = body.projectDescription.trim() || null;
  if (isProjectStatus(body.status)) update.status = body.status;
  if (isProjectPriority(body.priority)) update.priority = body.priority;
  if (body.budget !== undefined) update.budget = typeof body.budget === "number" ? body.budget : Number(body.budget) || 0;
  if (typeof body.deadline === "string") update.deadline = body.deadline ? new Date(body.deadline).toISOString() : null;

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "No valid project fields supplied." }, { status: 400 });
  }

  const { data: project, error } = await supabase
    .from("client_projects")
    .update(update)
    .eq("id", projectId)
    .select("id,organization_id,client_name,client_email,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("project_activity_logs").insert({
    organization_id: existingProject.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "project_updated",
    metadata: update,
  });

  return NextResponse.json({ success: true, project });
}

export const POST = PATCH;
