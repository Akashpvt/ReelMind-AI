import { BaseProvider } from "@/lib/providers/base-provider";
import { generateVideo } from "@/lib/providers/runway-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, VideoPayload, VideoProviderData } from "@/lib/providers/provider-types";

export class RunwayProvider extends BaseProvider<VideoPayload, VideoProviderData> {
  readonly definition: ProviderDefinition = {
    id: "runway",
    name: "Runway",
    capabilities: ["video"],
    requiredEnv: ["RUNWAY_API_KEY"],
    defaultModel: "gen4_turbo",
    docsUrl: "https://docs.dev.runwayml.com",
  };

  protected async mock(request: ProviderRequest<VideoPayload>): Promise<VideoProviderData> {
    const durationSeconds = request.payload.durationSeconds ?? 30;
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      videoUrl: null,
      downloadUrl: null,
      thumbnailUrl: null,
      providerJobId: `mock-runway-${request.payload.prompt.length}`,
      prompt: request.payload.prompt,
      durationSeconds,
      status: "placeholder",
    };
  }

  protected async callProvider(request: ProviderRequest<VideoPayload>, env: ProviderEnv): Promise<VideoProviderData> {
    return generateVideo({
      apiKey: env.RUNWAY_API_KEY,
      prompt: request.payload.prompt,
      durationSeconds: request.payload.durationSeconds ?? 30,
      aspectRatio: request.payload.aspectRatio,
      quality: request.payload.quality,
      style: request.payload.style,
      promptImage: request.payload.thumbnailUrl,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
