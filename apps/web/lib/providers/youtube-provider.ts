import { BaseProvider } from "@/lib/providers/base-provider";
import { publishContent } from "@/lib/providers/youtube-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, PublishingPayload, PublishingProviderData } from "@/lib/providers/provider-types";

export class YouTubeProvider extends BaseProvider<PublishingPayload, PublishingProviderData> {
  readonly definition: ProviderDefinition = {
    id: "youtube",
    name: "YouTube Data API",
    capabilities: ["publishing"],
    requiredEnv: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"],
    defaultModel: "youtube-v3",
    docsUrl: "https://developers.google.com/youtube/v3",
  };

  protected async mock(request: ProviderRequest<PublishingPayload>): Promise<PublishingProviderData> {
    return {
      publishId: `pkg-yt-${request.payload.title.length}`,
      platform: "youtube",
      status: "package_only",
      scheduledTime: request.payload.scheduleTime ?? null,
      publishUrl: null,
      accountName: null,
    };
  }

  protected async callProvider(request: ProviderRequest<PublishingPayload>, env: ProviderEnv): Promise<PublishingProviderData> {
    return publishContent({
      ...request.payload,
      appId: env.YOUTUBE_CLIENT_ID,
      appSecret: env.YOUTUBE_CLIENT_SECRET,
      timeoutMs: request.timeoutMs,
    });
  }
}
