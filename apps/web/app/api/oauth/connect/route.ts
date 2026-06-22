import { NextResponse } from "next/server";
import { buildAuthorizationUrl, isPublishPlatform } from "@/lib/oauth-providers";
import { createClient } from "@/lib/supabase/server";

function encodeState(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));
  }

  const url = new URL(request.url);
  const platform = url.searchParams.get("platform");
  if (!isPublishPlatform(platform)) {
    return NextResponse.redirect(new URL("/dashboard?oauth=invalid_platform", request.url));
  }

  const nonce = crypto.randomUUID();
  const state = encodeState({ platform, userId: data.user.id, nonce });
  const auth = buildAuthorizationUrl(platform, request, state);
  if ("error" in auth) {
    return NextResponse.redirect(new URL(`/dashboard?oauth=${encodeURIComponent(auth.error)}`, request.url));
  }

  const response = NextResponse.redirect(auth.url);
  response.cookies.set("reelmind_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });
  return response;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { platform?: unknown; action?: unknown };
  if (!isPublishPlatform(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  if (body.action === "disconnect") {
    const { error } = await supabase
      .from("connected_accounts")
      .update({
        status: "Not Connected",
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.user.id)
      .eq("platform", body.platform);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ success: true, platform: body.platform, status: "Not Connected" });
  }

  return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
}
