import { NextResponse } from "next/server";
import { isPublishPlatform, type PublishPlatform } from "@/lib/oauth-providers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type ScheduleBody = {
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

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function schedulePayload(platform: PublishPlatform, body: ScheduleBody) {
  return {
    platform,
    title: asString(body.title, "Untitled ReelMind schedule"),
    caption: asString(body.description),
    hashtags: asString(body.hashtags),
    thumbnailUrl: typeof body.thumbnailUrl === "string" ? body.thumbnailUrl : null,
    videoUrl: typeof body.videoUrl === "string" ? body.videoUrl : null,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ScheduleBody;
  if (!isPublishPlatform(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  const scheduledFor = typeof body.scheduledFor === "string" ? body.scheduledFor : "";
  const scheduledTime = Date.parse(scheduledFor);
  if (!Number.isFinite(scheduledTime) || scheduledTime <= Date.now()) {
    return NextResponse.json({ error: "Schedule date/time must be in the future." }, { status: 400 });
  }

  const { error: creditError } = await supabase.rpc("consume_creator_credits", {
    credit_action: "schedule_post",
    credit_amount: 1,
  });
  if (creditError) {
    const insufficient = /insufficient credits/i.test(creditError.message);
    return NextResponse.json({ error: insufficient ? "Insufficient credits" : creditError.message }, { status: insufficient ? 402 : 500 });
  }

  const projectId = typeof body.projectId === "string" && !body.projectId.startsWith("pending-") ? body.projectId : null;
  const platform = body.platform;
  const payload = schedulePayload(platform, body);
  const { data: job, error: jobError } = await supabase
    .from("publishing_jobs")
    .insert({
      user_id: data.user.id,
      project_id: projectId,
      platform,
      title: payload.title,
      description: payload.caption,
      hashtags: payload.hashtags,
      thumbnail_url: payload.thumbnailUrl,
      video_url: payload.videoUrl,
      scheduled_for: new Date(scheduledTime).toISOString(),
      timezone: asString(body.timezone, "UTC"),
      status: "Scheduled",
      platform_payload: payload,
      metadata: { providerMode: "scheduled_manual_or_oauth" },
    })
    .select("id")
    .single();

  if (jobError) {
    return NextResponse.json({ error: jobError.message }, { status: 400 });
  }

  const jobId = (job as { id: string }).id;
  const { error: scheduleError } = await supabase.from("scheduled_posts").insert({
    user_id: data.user.id,
    project_id: projectId,
    publishing_job_id: jobId,
    platform,
    scheduled_for: new Date(scheduledTime).toISOString(),
    timezone: asString(body.timezone, "UTC"),
    status: "Scheduled",
    payload,
  });

  if (scheduleError) {
    return NextResponse.json({ error: scheduleError.message }, { status: 400 });
  }

  await supabase.from("publishing_history").insert({
    user_id: data.user.id,
    project_id: projectId,
    publishing_job_id: jobId,
    platform,
    action: "schedule_post",
    status: "Scheduled",
    detail: `${platform} post scheduled.`,
    credits_used: 1,
    metadata: payload,
  });

  return NextResponse.json({
    success: true,
    status: "Scheduled",
    jobId,
    platform,
    scheduledFor: new Date(scheduledTime).toISOString(),
    creditsUsed: 1,
  });
}
