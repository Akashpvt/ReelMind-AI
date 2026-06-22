import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const fileId = typeof body.fileId === "string" ? body.fileId : "";
  if (!fileId) {
    return NextResponse.json({ error: "fileId is required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: access, error: accessError } = await adminSupabase
    .from("client_project_access")
    .select("id,organization_id,project_id,client_email,status,expires_at")
    .eq("access_token", token)
    .single();

  if (accessError || !access || access.status !== "active" || isExpired(access.expires_at)) {
    return NextResponse.json({ error: "Client portal link is invalid or expired." }, { status: 404 });
  }

  const { data: file, error: fileError } = await adminSupabase
    .from("project_files")
    .select("id,organization_id,project_id,file_name,file_url")
    .eq("id", fileId)
    .eq("project_id", access.project_id)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: fileError?.message ?? "File not found." }, { status: 404 });
  }

  const { data: signed, error } = await adminSupabase.storage.from("project-files").createSignedUrl(file.file_url, 60);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: error?.message ?? "Unable to create download URL." }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: access.organization_id,
    project_id: access.project_id,
    user_id: null,
    action: "file_downloaded",
    metadata: { fileName: file.file_name, clientEmail: access.client_email },
  });

  return NextResponse.json({ url: signed.signedUrl });
}
