import { ProviderError } from "@/lib/providers/provider-errors";
import { executePublishingRequest, fallbackPublishUrl, normalizedScheduleTime, nowIso, publishingMode, requireOAuthToken, type PublishingClientRequest, type PublishingClientResponse, usageFromPublishing, withTimeout } from "@/lib/providers/publishing-client-utils";

export async function publishContent(request: PublishingClientRequest): Promise<PublishingClientResponse> {
  const startedAt = Date.now();
  return executePublishingRequest("facebook", async () => {
    requireOAuthToken("facebook", request.oauthToken);
    const mode = publishingMode(request);
    const scheduledTime = normalizedScheduleTime(request.scheduleTime);
    const scheduledPublishTime = mode === "scheduled" ? Math.floor(new Date(scheduledTime ?? nowIso()).getTime() / 1000) : undefined;

    const response = await withTimeout(
      fetch("https://graph.facebook.com/v19.0/me/videos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.oauthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: request.title,
          description: `${request.description}\n\n${request.hashtags.join(" ")}`.trim(),
          file_url: request.videoUrl,
          thumb: request.thumbnailUrl,
          published: mode === "publish_now",
          unpublished_content_type: mode === "draft" ? "DRAFT" : undefined,
          scheduled_publish_time: scheduledPublishTime,
        }),
      }),
      request.timeoutMs ?? 45000,
      "facebook",
    );

    if (!response.ok) {
      throw new ProviderError("facebook", `HTTP_${response.status}`, `Facebook publish failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    }

    const payload = await response.json() as { id?: string };
    const publishId = payload.id ?? `fb-${Date.now()}`;
    return {
      publishId,
      platform: "facebook",
      status: mode === "scheduled" ? "scheduled" : mode === "draft" ? "draft" : "published",
      scheduledTime: mode === "scheduled" ? (scheduledTime ?? nowIso()) : null,
      publishUrl: fallbackPublishUrl("facebook", publishId),
      accountName: "Facebook Page",
      usage: usageFromPublishing(request, startedAt),
    };
  }, request.retries ?? 1);
}
