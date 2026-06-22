import { NextResponse } from "next/server";
import { isPublishPlatform, refreshAccountToken, type PublishPlatform } from "@/lib/oauth-providers";
import { createClient } from "@/lib/supabase/server";

type PublishBody = {
  jobId?: unknown;
  platform?: unknown;
  projectId?: unknown;
  title?: unknown;
  description?: unknown;
  hashtags?: unknown;
  thumbnailUrl?: unknown;
  videoUrl?: unknown;
  scheduledFor?: unknown;
  timezone?: unknown;
};

type AccountRow = {
  id: string;
  platform: PublishPlatform;
  status: "Connected" | "Not Connected" | "Expired";
  refresh_token_encrypted: string | null;
  expires_at: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as PublishBody;
  if (!isPublishPlatform(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const platform = body.platform;
  const { data: account, error: accountError } = await supabase
    .from("connected_accounts")
    .select("id,platform,status,refresh_token_encrypted,expires_at")
    .eq("user_id", data.user.id)
    .eq("platform", platform)
    .maybeSingle();

  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 400 });
  }

  const accountRow = account as AccountRow | null;
  if (!accountRow || accountRow.status !== "Connected") {
    return NextResponse.json({ error: `${platform} is not connected.`, status: "Failed" }, { status: 409 });
  }

  if (accountRow.expires_at && Date.parse(accountRow.expires_at) <= Date.now() + 60_000) {
    const refreshed = await refreshAccountToken(supabase, accountRow);
    if (!refreshed.ok) {
      return NextResponse.json({ error: refreshed.error, status: "Failed" }, { status: 409 });
    }
  }

  let jobId = typeof body.jobId === "string" ? body.jobId : null;
  if (!jobId) {
    const { data: job, error: insertError } = await supabase
      .from("publishing_jobs")
      .insert({
        user_id: data.user.id,
        project_id: typeof body.projectId === "string" ? body.projectId : null,
        platform,
        title: typeof body.title === "string" ? body.title : "Untitled ReelMind publish",
        description: typeof body.description === "string" ? body.description : "",
        hashtags: typeof body.hashtags === "string" ? body.hashtags : "",
        thumbnail_url: typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null,
        video_url: typeof body.videoUrl === "string" ? body.videoUrl : null,
        scheduled_for: typeof body.scheduledFor === "string" ? body.scheduledFor : null,
        timezone: typeof body.timezone === "string" ? body.timezone : "UTC",
        status: "Publishing",
        metadata: { providerMode: "oauth-ready-mvp" },
      })
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }
    jobId = (job as { id: string }).id;
  } else {
    await supabase
      .from("publishing_jobs")
      .update({ status: "Publishing", updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("user_id", data.user.id);
  }

  const publishedAt = new Date().toISOString();
  const { error: updateError } = await supabase
    .from("publishing_jobs")
    .update({
      status: "Published",
      metadata: { providerMode: "oauth-ready-mvp", publishedAt },
      updated_at: publishedAt,
    })
    .eq("id", jobId)
    .eq("user_id", data.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message, status: "Failed" }, { status: 400 });
  }

  await supabase.from("publish_events").insert({
    user_id: data.user.id,
    project_id: typeof body.projectId === "string" ? body.projectId : null,
    publishing_job_id: jobId,
    event_type: "published",
    detail: `${platform} publish completed through OAuth-ready adapter.`,
    metadata: { providerMode: "oauth-ready-mvp" },
  });

  return NextResponse.json({
    success: true,
    status: "Published",
    jobId,
    platform,
    providerMessage: "OAuth account verified. Real media upload adapter can be enabled after provider app review.",
  });
}
