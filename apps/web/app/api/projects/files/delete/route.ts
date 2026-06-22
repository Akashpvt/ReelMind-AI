import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { canEditAssets } from "@/lib/team/permissions";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fileId = typeof body.fileId === "string" ? body.fileId : "";
  if (!fileId) {
    return NextResponse.json({ error: "fileId is required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: file, error: fileError } = await adminSupabase
    .from("project_files")
    .select("id,organization_id,project_id,file_name,file_url")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: fileError?.message ?? "File not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, file.organization_id);
  if (!activeTeam || !canEditAssets(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to delete files." }, { status: 403 });
  }

  const { error: removeError } = await adminSupabase.storage.from("project-files").remove([file.file_url]);
  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 400 });
  }

  const { error } = await adminSupabase.from("project_files").delete().eq("id", fileId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: file.organization_id,
    project_id: file.project_id,
    user_id: user.id,
    action: "file_deleted",
    metadata: { fileName: file.file_name },
  });

  return NextResponse.json({ success: true });
}
