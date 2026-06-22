import { ProviderError } from "@/lib/providers/provider-errors";
import { executePublishingRequest, fallbackPublishUrl, normalizedScheduleTime, nowIso, publishingMode, requireOAuthToken, type PublishingClientRequest, type PublishingClientResponse, usageFromPublishing, withTimeout } from "@/lib/providers/publishing-client-utils";

export async function publishContent(request: PublishingClientRequest): Promise<PublishingClientResponse> {
  const startedAt = Date.now();
  return executePublishingRequest("youtube", async () => {
    requireOAuthToken("youtube", request.oauthToken);
    const mode = publishingMode(request);
    const scheduledTime = normalizedScheduleTime(request.scheduleTime);

    const response = await withTimeout(
      fetch("https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${request.oauthToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          snippet: {
            title: request.title,
            description: `${request.description}\n\n${request.hashtags.join(" ")}`.trim(),
            tags: request.hashtags.map((item) => item.replace(/^#/, "")),
            categoryId: "27",
          },
          status: {
            privacyStatus: mode === "draft" ? "private" : mode === "scheduled" ? "private" : "public",
            publishAt: mode === "scheduled" ? (scheduledTime ?? nowIso()) : undefined,
          },
        }),
      }),
      request.timeoutMs ?? 45000,
      "youtube",
    );

    if (!response.ok) {
      throw new ProviderError("youtube", `HTTP_${response.status}`, `YouTube publish failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    }
    const payload = await response.json() as { id?: string; snippet?: { channelTitle?: string } };
    const publishId = payload.id ?? `yt-${Date.now()}`;
    return {
      publishId,
      platform: "youtube",
      status: mode === "scheduled" ? "scheduled" : mode === "draft" ? "draft" : "published",
      scheduledTime: mode === "scheduled" ? (scheduledTime ?? nowIso()) : null,
      publishUrl: fallbackPublishUrl("youtube", publishId),
      accountName: payload.snippet?.channelTitle ?? null,
      usage: usageFromPublishing(request, startedAt),
    };
  }, request.retries ?? 1);
}
