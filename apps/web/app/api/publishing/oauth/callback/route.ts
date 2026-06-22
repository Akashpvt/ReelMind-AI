import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeCodeForTokens, isPublishPlatform } from "@/lib/oauth-providers";
import { encryptToken } from "@/lib/secure-tokens";
import { createClient } from "@/lib/supabase/server";

type OAuthState = {
  platform?: unknown;
  userId?: unknown;
  nonce?: unknown;
};

function decodeState(value: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as OAuthState;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const storedState = cookieStore.get("reelmind_oauth_state")?.value;

  if (!code || !returnedState || !storedState || returnedState !== storedState) {
    return NextResponse.redirect(new URL("/dashboard?oauth=invalid_state", request.url));
  }

  const state = decodeState(returnedState);
  if (!state || !isPublishPlatform(state.platform) || typeof state.userId !== "string") {
    return NextResponse.redirect(new URL("/dashboard?oauth=invalid_state", request.url));
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user || data.user.id !== state.userId) {
    return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(state.platform, request, code);
    if (!tokens.access_token) {
      throw new Error("Provider did not return an access token.");
    }

    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;
    const accountPayload = {
        user_id: data.user.id,
        platform: state.platform,
        status: "Connected",
        account_name: `${state.platform} account`,
        access_token_encrypted: encryptToken(tokens.access_token),
        refresh_token_encrypted: encryptToken(tokens.refresh_token),
        expires_at: expiresAt,
        metadata: {
          tokenType: tokens.token_type ?? null,
          scope: tokens.scope ?? null,
          openId: tokens.open_id ?? null,
        },
        updated_at: new Date().toISOString(),
      };
    const { error } = await supabase.from("publishing_accounts").upsert(
      accountPayload,
      { onConflict: "user_id,platform" },
    );

    if (error) {
      throw error;
    }

    await supabase.from("connected_accounts").upsert(accountPayload, { onConflict: "user_id,platform" });

    const response = NextResponse.redirect(new URL(`/dashboard?oauth=connected&platform=${state.platform}`, request.url));
    response.cookies.delete("reelmind_oauth_state");
    return response;
  } catch (error) {
    return NextResponse.redirect(
      new URL(`/dashboard?oauth=${encodeURIComponent(error instanceof Error ? error.message : "OAuth connection failed")}`, request.url),
    );
  }
}
