import { BaseProvider } from "@/lib/providers/base-provider";
import { generateVideo } from "@/lib/providers/veo-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, VideoPayload, VideoProviderData } from "@/lib/providers/provider-types";

export class VeoProvider extends BaseProvider<VideoPayload, VideoProviderData> {
  readonly definition: ProviderDefinition = {
    id: "veo",
    name: "Veo",
    capabilities: ["video"],
    requiredEnv: ["VEO_API_KEY"],
    defaultModel: "veo-3.1-generate-preview",
    docsUrl: "https://ai.google.dev/gemini-api/docs/video",
  };

  protected async mock(request: ProviderRequest<VideoPayload>): Promise<VideoProviderData> {
    const durationSeconds = request.payload.durationSeconds ?? 30;
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      videoUrl: null,
      downloadUrl: null,
      thumbnailUrl: null,
      providerJobId: `mock-veo-${request.payload.prompt.length}`,
      prompt: request.payload.prompt,
      durationSeconds,
      status: "placeholder",
    };
  }

  protected async callProvider(request: ProviderRequest<VideoPayload>, env: ProviderEnv): Promise<VideoProviderData> {
    return generateVideo({
      apiKey: env.VEO_API_KEY ?? env.GEMINI_API_KEY,
      prompt: request.payload.prompt,
      durationSeconds: request.payload.durationSeconds ?? 30,
      aspectRatio: request.payload.aspectRatio,
      quality: request.payload.quality,
      style: request.payload.style,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
