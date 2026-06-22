import { BaseProvider } from "@/lib/providers/base-provider";
import { publishContent } from "@/lib/providers/instagram-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, PublishingPayload, PublishingProviderData } from "@/lib/providers/provider-types";

export class InstagramProvider extends BaseProvider<PublishingPayload, PublishingProviderData> {
  readonly definition: ProviderDefinition = {
    id: "instagram",
    name: "Instagram Graph API",
    capabilities: ["publishing"],
    requiredEnv: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"],
    defaultModel: "instagram-graph",
    docsUrl: "https://developers.facebook.com/docs/instagram-api/",
  };

  protected async mock(request: ProviderRequest<PublishingPayload>): Promise<PublishingProviderData> {
    return {
      publishId: `pkg-ig-${request.payload.title.length}`,
      platform: "instagram",
      status: "package_only",
      scheduledTime: request.payload.scheduleTime ?? null,
      publishUrl: null,
      accountName: null,
    };
  }

  protected async callProvider(request: ProviderRequest<PublishingPayload>, env: ProviderEnv): Promise<PublishingProviderData> {
    return publishContent({
      ...request.payload,
      appId: env.INSTAGRAM_APP_ID,
      appSecret: env.INSTAGRAM_APP_SECRET,
      timeoutMs: request.timeoutMs,
    });
  }
}
