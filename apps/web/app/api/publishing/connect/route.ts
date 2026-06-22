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

  const state = encodeState({ platform, userId: data.user.id, nonce: crypto.randomUUID() });
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
