import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/secure-tokens";

export type PublishPlatform = "YouTube" | "Instagram" | "TikTok" | "Facebook";
export type ConnectedAccountStatus = "Connected" | "Not Connected" | "Expired";

type ProviderConfig = {
  platform: PublishPlatform;
  authUrl: string;
  tokenUrl: string;
  clientId?: string;
  clientSecret?: string;
  scopes: string[];
  extraAuthParams?: Record<string, string>;
};

export type OAuthTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  open_id?: string;
  error?: string;
  error_description?: string;
  message?: string;
};

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

const metaScopes = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "pages_manage_metadata",
  "instagram_basic",
  "instagram_content_publish",
];

const tiktokScopes = ["user.info.basic", "video.upload", "video.publish"];

export function providerForPlatform(platform: PublishPlatform): ProviderConfig {
  if (platform === "YouTube") {
    return {
      platform,
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scopes: googleScopes,
      extraAuthParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
    };
  }

  if (platform === "Instagram" || platform === "Facebook") {
    return {
      platform,
      authUrl: "https://www.facebook.com/v20.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v20.0/oauth/access_token",
      clientId: process.env.META_APP_ID,
      clientSecret: process.env.META_APP_SECRET,
      scopes: metaScopes,
      extraAuthParams: { auth_type: "rerequest" },
    };
  }

  return {
    platform,
    authUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    clientId: process.env.TIKTOK_CLIENT_KEY,
    clientSecret: process.env.TIKTOK_CLIENT_SECRET,
    scopes: tiktokScopes,
  };
}

export function isPublishPlatform(value: unknown): value is PublishPlatform {
  return value === "YouTube" || value === "Instagram" || value === "TikTok" || value === "Facebook";
}

export function oauthRedirectUri(request: Request) {
  return new URL("/api/publishing/oauth/callback", request.url).toString();
}

export function buildAuthorizationUrl(platform: PublishPlatform, request: Request, state: string): { url: URL } | { error: string } {
  const provider = providerForPlatform(platform);
  if (!provider.clientId || !provider.clientSecret) {
    return { error: `${platform} OAuth is not configured.` };
  }

  const url = new URL(provider.authUrl);
  url.searchParams.set(platform === "TikTok" ? "client_key" : "client_id", provider.clientId);
  url.searchParams.set("redirect_uri", oauthRedirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", provider.scopes.join(platform === "TikTok" ? "," : " "));
  url.searchParams.set("state", state);
  Object.entries(provider.extraAuthParams ?? {}).forEach(([key, value]) => url.searchParams.set(key, value));
  return { url };
}

export async function exchangeCodeForTokens(platform: PublishPlatform, request: Request, code: string) {
  const provider = providerForPlatform(platform);
  if (!provider.clientId || !provider.clientSecret) {
    throw new Error(`${platform} OAuth is not configured.`);
  }

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: oauthRedirectUri(request),
  });

  if (platform === "TikTok") {
    body.set("client_key", provider.clientId);
    body.set("client_secret", provider.clientSecret);
  } else {
    body.set("client_id", provider.clientId);
    body.set("client_secret", provider.clientSecret);
  }

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as OAuthTokenResponse;
  if (!response.ok || payload.error) {
    throw new Error(payload.error_description ?? payload.message ?? payload.error ?? "OAuth token exchange failed.");
  }
  return payload;
}

export async function refreshAccountToken(
  supabase: SupabaseClient,
  account: {
    id: string;
    platform: PublishPlatform;
    refresh_token_encrypted: string | null;
  },
  tableName: "connected_accounts" | "publishing_accounts" = "connected_accounts",
) {
  const provider = providerForPlatform(account.platform);
  const refreshToken = decryptToken(account.refresh_token_encrypted);
  if (!refreshToken || !provider.clientId || !provider.clientSecret) {
    await supabase.from(tableName).update({ status: "Expired" }).eq("id", account.id);
    return { ok: false, error: "Reconnect required." };
  }

  const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken });
  if (account.platform === "TikTok") {
    body.set("client_key", provider.clientId);
    body.set("client_secret", provider.clientSecret);
  } else {
    body.set("client_id", provider.clientId);
    body.set("client_secret", provider.clientSecret);
  }

  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as OAuthTokenResponse;
  if (!response.ok || payload.error || !payload.access_token) {
    await supabase.from(tableName).update({ status: "Expired" }).eq("id", account.id);
    return { ok: false, error: payload.error_description ?? payload.error ?? "Token refresh failed." };
  }

  const expiresAt = payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null;
  await supabase
    .from(tableName)
    .update({
      status: "Connected",
      access_token_encrypted: encryptToken(payload.access_token),
      refresh_token_encrypted: encryptToken(payload.refresh_token ?? refreshToken),
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id);

  return { ok: true };
}
