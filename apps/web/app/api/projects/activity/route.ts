import { NextResponse } from "next/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { createClient } from "@/lib/supabase/server";
import { canEditAssets } from "@/lib/team/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("client_projects")
    .select("id,organization_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, project.organization_id);
  if (!activeTeam) {
    return NextResponse.json({ error: "Project is not available for this user." }, { status: 403 });
  }

  const { data: activity, error } = await supabase
    .from("project_activity_logs")
    .select("id,organization_id,project_id,user_id,action,metadata,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ activity: activity ?? [] });
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
  const action = typeof body.action === "string" && body.action.trim() ? body.action.trim() : "note_added";
  const metadata = body.metadata && typeof body.metadata === "object" ? body.metadata : {};

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  const { data: project, error: projectError } = await supabase
    .from("client_projects")
    .select("id,organization_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, project.organization_id);
  if (!activeTeam || !canEditAssets(activeTeam.membership.role)) {
    return NextResponse.json({ error: "Project is not available for this user." }, { status: 403 });
  }

  const { data: activity, error } = await supabase
    .from("project_activity_logs")
    .insert({
      organization_id: project.organization_id,
      project_id: projectId,
      user_id: user.id,
      action,
      metadata,
    })
    .select("id,organization_id,project_id,user_id,action,metadata,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, activity });
}
