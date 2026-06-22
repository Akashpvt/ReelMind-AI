import { ProviderError } from "@/lib/providers/provider-errors";
import { executePublishingRequest, fallbackPublishUrl, normalizedScheduleTime, nowIso, publishingMode, requireOAuthToken, type PublishingClientRequest, type PublishingClientResponse, usageFromPublishing, withTimeout } from "@/lib/providers/publishing-client-utils";

export async function publishContent(request: PublishingClientRequest): Promise<PublishingClientResponse> {
  const startedAt = Date.now();
  return executePublishingRequest("tiktok", async () => {
    requireOAuthToken("tiktok", request.oauthToken);
    const mode = publishingMode(request);
    const scheduledTime = normalizedScheduleTime(request.scheduleTime);

    const response = await withTimeout(
      fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.oauthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_info: {
            title: request.title,
            description: `${request.description}\n\n${request.hashtags.join(" ")}`.trim(),
            privacy_level: mode === "draft" ? "SELF_ONLY" : "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            video_cover_timestamp_ms: 0,
            auto_add_music: false,
            publish_time: mode === "scheduled" ? Math.floor(new Date(scheduledTime ?? nowIso()).getTime() / 1000) : undefined,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: request.videoUrl,
          },
        }),
      }),
      request.timeoutMs ?? 45000,
      "tiktok",
    );

    if (!response.ok) {
      throw new ProviderError("tiktok", `HTTP_${response.status}`, `TikTok publish failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    }
    const payload = await response.json() as { data?: { publish_id?: string } };
    const publishId = payload.data?.publish_id ?? `tt-${Date.now()}`;
    return {
      publishId,
      platform: "tiktok",
      status: mode === "scheduled" ? "scheduled" : mode === "draft" ? "draft" : "published",
      scheduledTime: mode === "scheduled" ? (scheduledTime ?? nowIso()) : null,
      publishUrl: fallbackPublishUrl("tiktok", publishId),
      accountName: "TikTok Account",
      usage: usageFromPublishing(request, startedAt),
    };
  }, request.retries ?? 1);
}
