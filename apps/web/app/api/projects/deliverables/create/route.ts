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
  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const fileUrl = typeof body.fileUrl === "string" ? body.fileUrl.trim() : "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  if (!fileName || !fileUrl) {
    return NextResponse.json({ error: "File name and file URL are required." }, { status: 400 });
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
    return NextResponse.json({ error: "User must be an active organization member to upload deliverables." }, { status: 403 });
  }

  const { data: deliverable, error } = await adminSupabase
    .from("project_deliverables")
    .insert({
      organization_id: project.organization_id,
      project_id: projectId,
      uploaded_by: user.id,
      file_name: fileName,
      file_url: fileUrl,
    })
    .select("id,organization_id,project_id,uploaded_by,file_name,file_url,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: project.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "deliverable_uploaded",
    metadata: { fileName },
  });

  return NextResponse.json({ success: true, deliverable });
}
