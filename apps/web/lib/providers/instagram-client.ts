import { ProviderError } from "@/lib/providers/provider-errors";
import { executePublishingRequest, fallbackPublishUrl, normalizedScheduleTime, nowIso, publishingMode, requireOAuthToken, type PublishingClientRequest, type PublishingClientResponse, usageFromPublishing, withTimeout } from "@/lib/providers/publishing-client-utils";

export async function publishContent(request: PublishingClientRequest): Promise<PublishingClientResponse> {
  const startedAt = Date.now();
  return executePublishingRequest("instagram", async () => {
    requireOAuthToken("instagram", request.oauthToken);
    const mode = publishingMode(request);
    const scheduledTime = normalizedScheduleTime(request.scheduleTime);
    const isScheduled = mode === "scheduled";
    const publishStatus = mode === "draft" ? "draft" : isScheduled ? "scheduled" : "published";

    const response = await withTimeout(
      fetch("https://graph.facebook.com/v19.0/me/media", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.oauthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          caption: `${request.description}\n\n${request.hashtags.join(" ")}`.trim(),
          video_url: request.videoUrl,
          thumb_offset: 1000,
          publish_time: isScheduled ? Math.floor(new Date(scheduledTime ?? nowIso()).getTime() / 1000) : undefined,
          scheduled_publish_time: isScheduled ? Math.floor(new Date(scheduledTime ?? nowIso()).getTime() / 1000) : undefined,
        }),
      }),
      request.timeoutMs ?? 45000,
      "instagram",
    );

    if (!response.ok) {
      throw new ProviderError("instagram", `HTTP_${response.status}`, `Instagram publish failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    }

    const payload = await response.json() as { id?: string };
    const publishId = payload.id ?? `ig-${Date.now()}`;
    return {
      publishId,
      platform: "instagram",
      status: publishStatus,
      scheduledTime: isScheduled ? (scheduledTime ?? nowIso()) : null,
      publishUrl: fallbackPublishUrl("instagram", publishId),
      accountName: "Instagram Account",
      usage: usageFromPublishing(request, startedAt),
    };
  }, request.retries ?? 1);
}
