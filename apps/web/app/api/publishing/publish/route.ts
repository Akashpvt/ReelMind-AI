import { NextResponse } from "next/server";
import {
  isPublishPlatform,
  providerForPlatform,
  refreshAccountToken,
  type PublishPlatform,
} from "@/lib/oauth-providers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PublishBody = {
  platform?: unknown;
  projectId?: unknown;
  title?: unknown;
  description?: unknown;
  hashtags?: unknown;
  thumbnailUrl?: unknown;
  videoUrl?: unknown;
  scheduledFor?: unknown;
  timezone?: unknown;
  package?: unknown;
  mode?: unknown;
};

type AccountRow = {
  id: string;
  platform: PublishPlatform;
  status: "Connected" | "Not Connected" | "Expired";
  refresh_token_encrypted: string | null;
  expires_at: string | null;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function platformPackage(platform: PublishPlatform, body: PublishBody) {
  const title = asString(body.title, "Untitled ReelMind publish");
  const description = asString(body.description);
  const hashtags = asString(body.hashtags);
  const thumbnailUrl = typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null;
  const videoUrl = typeof body.videoUrl === "string" ? body.videoUrl : null;

  if (platform === "YouTube") {
    return {
      type: "YouTube Shorts",
      title,
      description,
      tags: hashtags.split(/\s+/).filter(Boolean).map((tag) => tag.replace(/^#/, "")),
      category: "22",
      visibility: "private",
      thumbnailUrl,
      videoUrl,
    };
  }

  if (platform === "Instagram") {
    return {
      type: "Instagram Reels",
      caption: description,
      hashtags,
      coverImage: thumbnailUrl,
      videoUrl,
    };
  }

  if (platform === "Facebook") {
    return {
      type: "Facebook Reels",
      caption: description,
      hashtags,
      pageSelector: null,
      coverImage: thumbnailUrl,
      videoUrl,
    };
  }

  return {
    type: "TikTok",
    caption: description,
    hashtags,
    privacyStatus: "SELF_ONLY",
    coverImage: thumbnailUrl,
    videoUrl,
  };
}

async function consumeCredits(supabase: Awaited<ReturnType<typeof createClient>>, action: "publish_now" | "export_package") {
  const amount = action === "publish_now" ? 2 : 1;
  const { error } = await supabase.rpc("consume_creator_credits", {
    credit_action: action,
    credit_amount: amount,
  });
  return { error, amount };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as PublishBody;
  if (!isPublishPlatform(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const platform = body.platform;
  const isManualExport = body.mode === "manual_export";
  const { error: creditError, amount: creditsUsed } = await consumeCredits(
    supabase,
    isManualExport ? "export_package" : "publish_now",
  );
  if (creditError) {
    const insufficient = /insufficient credits/i.test(creditError.message);
    return NextResponse.json({ error: insufficient ? "Insufficient credits" : creditError.message }, { status: insufficient ? 402 : 500 });
  }

  const payload = platformPackage(platform, body);
  const provider = providerForPlatform(platform);
  const hasProviderCredentials = Boolean(provider.clientId && provider.clientSecret);
  const projectId = typeof body.projectId === "string" && !body.projectId.startsWith("pending-") ? body.projectId : null;

  let accountConnected = false;
  let failureReason: string | null = null;
  if (!isManualExport && hasProviderCredentials) {
    const { data: account, error: accountError } = await supabase
      .from("publishing_accounts")
      .select("id,platform,status,refresh_token_encrypted,expires_at")
      .eq("user_id", data.user.id)
      .eq("platform", platform)
      .maybeSingle();

    if (accountError) {
      failureReason = accountError.message;
    } else {
      const accountRow = account as AccountRow | null;
      accountConnected = Boolean(accountRow && accountRow.status === "Connected");
      if (accountRow?.expires_at && Date.parse(accountRow.expires_at) <= Date.now() + 60_000) {
        const refreshed = await refreshAccountToken(supabase, accountRow, "publishing_accounts");
        accountConnected = refreshed.ok;
        failureReason = refreshed.ok ? null : refreshed.error ?? "Reconnect required.";
      }
    }
  }

  const manualMode = isManualExport || !hasProviderCredentials || !accountConnected;
  const status = manualMode ? "Manual Publish Ready" : "Published";
  const detail = manualMode
    ? `${platform} package prepared for manual publishing.`
    : `${platform} publish completed through OAuth-ready adapter.`;

  const { data: job, error: jobError } = await supabase
    .from("publishing_jobs")
    .insert({
      user_id: data.user.id,
      project_id: projectId,
      platform,
      title: asString(body.title, "Untitled ReelMind publish"),
      description: asString(body.description),
      hashtags: asString(body.hashtags),
      thumbnail_url: typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null,
      video_url: typeof body.videoUrl === "string" ? body.videoUrl : null,
      scheduled_for: typeof body.scheduledFor === "string" ? body.scheduledFor : null,
      timezone: asString(body.timezone, "UTC"),
      status,
      package_type: payload.type,
      visibility: "visibility" in payload ? payload.visibility : null,
      privacy_status: "privacyStatus" in payload ? payload.privacyStatus : null,
      category: "category" in payload ? payload.category : null,
      platform_payload: payload,
      error_message: failureReason,
      metadata: {
        manualMode,
        hasProviderCredentials,
        accountConnected,
      },
    })
    .select("id")
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 400 });
  }

  await supabase.from("publishing_history").insert({
    user_id: data.user.id,
    project_id: projectId,
    publishing_job_id: (job as { id: string }).id,
    platform: manualMode ? "Manual Export" : platform,
    action: isManualExport ? "export_package" : "publish_now",
    status,
    detail,
    credits_used: creditsUsed,
    metadata: { package: payload, failureReason, manualMode },
  });

  return NextResponse.json({
    success: true,
    status,
    jobId: (job as { id: string }).id,
    platform,
    manualMode,
    creditsUsed,
    package: payload,
    message: detail,
  });
}
