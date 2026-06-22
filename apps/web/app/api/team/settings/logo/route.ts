import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionError, resolvePermission } from "@/lib/team/permission-guards";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const organizationId = String(form.get("organizationId") ?? "");
  const file = form.get("logo");
  const access = await resolvePermission("settings:manage", organizationId);
  if (!access.ok) return permissionError(access);
  if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Upload a PNG, JPG, WEBP, or SVG logo up to 2 MB." }, { status: 400 });
  const extension = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const path = `${organizationId}/logo-${Date.now()}.${extension}`;
  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage.from("workspace-branding").upload(path, file, { contentType: file.type, upsert: true });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
  const { data: publicUrl } = admin.storage.from("workspace-branding").getPublicUrl(path);
  const { error } = await admin.from("organization_settings").upsert({ organization_id: organizationId, logo_url: publicUrl.publicUrl, updated_at: new Date().toISOString() }, { onConflict: "organization_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("team_activity_logs").insert({ organization_id: organizationId, user_id: access.user.id, action: "branding_logo_updated", metadata: { logoUrl: publicUrl.publicUrl } });
  return NextResponse.json({ logoUrl: publicUrl.publicUrl });
}
