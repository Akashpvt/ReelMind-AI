import { BaseProvider } from "@/lib/providers/base-provider";
import { publishContent } from "@/lib/providers/tiktok-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, PublishingPayload, PublishingProviderData } from "@/lib/providers/provider-types";

export class TikTokProvider extends BaseProvider<PublishingPayload, PublishingProviderData> {
  readonly definition: ProviderDefinition = {
    id: "tiktok",
    name: "TikTok Content Posting API",
    capabilities: ["publishing"],
    requiredEnv: ["TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_SECRET"],
    defaultModel: "tiktok-publish-v2",
    docsUrl: "https://developers.tiktok.com/doc/content-posting-api-reference/",
  };

  protected async mock(request: ProviderRequest<PublishingPayload>): Promise<PublishingProviderData> {
    return {
      publishId: `pkg-tt-${request.payload.title.length}`,
      platform: "tiktok",
      status: "package_only",
      scheduledTime: request.payload.scheduleTime ?? null,
      publishUrl: null,
      accountName: null,
    };
  }

  protected async callProvider(request: ProviderRequest<PublishingPayload>, env: ProviderEnv): Promise<PublishingProviderData> {
    return publishContent({
      ...request.payload,
      appId: env.TIKTOK_CLIENT_ID,
      appSecret: env.TIKTOK_CLIENT_SECRET,
      timeoutMs: request.timeoutMs,
    });
  }
}
