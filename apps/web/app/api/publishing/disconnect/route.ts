import { NextResponse } from "next/server";
import { isPublishPlatform } from "@/lib/oauth-providers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { platform?: unknown };
  if (!isPublishPlatform(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const update = {
    status: "Not Connected",
    account_name: null,
    access_token_encrypted: null,
    refresh_token_encrypted: null,
    expires_at: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("publishing_accounts")
    .update(update)
    .eq("user_id", data.user.id)
    .eq("platform", body.platform);

  await supabase
    .from("connected_accounts")
    .update(update)
    .eq("user_id", data.user.id)
    .eq("platform", body.platform);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, platform: body.platform, status: "Not Connected" });
}
