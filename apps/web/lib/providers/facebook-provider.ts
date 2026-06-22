import { BaseProvider } from "@/lib/providers/base-provider";
import { publishContent } from "@/lib/providers/facebook-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, PublishingPayload, PublishingProviderData } from "@/lib/providers/provider-types";

export class FacebookProvider extends BaseProvider<PublishingPayload, PublishingProviderData> {
  readonly definition: ProviderDefinition = {
    id: "facebook",
    name: "Facebook Graph API",
    capabilities: ["publishing"],
    requiredEnv: ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"],
    defaultModel: "facebook-graph-v19",
    docsUrl: "https://developers.facebook.com/docs/graph-api",
  };

  protected async mock(request: ProviderRequest<PublishingPayload>): Promise<PublishingProviderData> {
    return {
      publishId: `pkg-fb-${request.payload.title.length}`,
      platform: "facebook",
      status: "package_only",
      scheduledTime: request.payload.scheduleTime ?? null,
      publishUrl: null,
      accountName: null,
    };
  }

  protected async callProvider(request: ProviderRequest<PublishingPayload>, env: ProviderEnv): Promise<PublishingProviderData> {
    return publishContent({
      ...request.payload,
      appId: env.FACEBOOK_APP_ID,
      appSecret: env.FACEBOOK_APP_SECRET,
      timeoutMs: request.timeoutMs,
    });
  }
}
