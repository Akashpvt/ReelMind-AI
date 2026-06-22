import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { canEditAssets } from "@/lib/team/permissions";

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
  const note = typeof body.note === "string" ? body.note.trim() : "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  if (!note) {
    return NextResponse.json({ error: "Note is required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: project, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, project.organization_id);
  if (!activeTeam || !canEditAssets(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to add notes." }, { status: 403 });
  }

  const { data: createdNote, error } = await adminSupabase
    .from("project_notes")
    .insert({
      organization_id: project.organization_id,
      project_id: projectId,
      user_id: user.id,
      note,
    })
    .select("id,organization_id,project_id,user_id,note,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: project.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "note_created",
    metadata: {
      notePreview: note.length > 80 ? `${note.slice(0, 80)}...` : note,
    },
  });

  return NextResponse.json({ success: true, note: createdNote });
}
