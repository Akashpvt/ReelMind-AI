import { BaseProvider } from "@/lib/providers/base-provider";
import { generateImage } from "@/lib/providers/gemini-image-client";
import { dimensionsForAspectRatio } from "@/lib/providers/image-client-utils";
import type { ImagePayload, ImageProviderData, ProviderDefinition, ProviderEnv, ProviderRequest } from "@/lib/providers/provider-types";

function placeholderImage(provider: string, payload: ImagePayload): ImageProviderData {
  const dimensions = dimensionsForAspectRatio(payload.aspectRatio);
  const label = encodeURIComponent(payload.prompt.slice(0, 96));
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">`,
    "<defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#07111f\"/><stop offset=\"0.52\" stop-color=\"#32115f\"/><stop offset=\"1\" stop-color=\"#05d9ff\"/></linearGradient></defs>",
    "<rect width=\"100%\" height=\"100%\" rx=\"42\" fill=\"url(#g)\"/>",
    "<circle cx=\"78%\" cy=\"18%\" r=\"180\" fill=\"#7c3aed\" opacity=\"0.28\"/>",
    "<circle cx=\"18%\" cy=\"82%\" r=\"220\" fill=\"#22d3ee\" opacity=\"0.22\"/>",
    `<text x="8%" y="52%" fill="#f8fbff" font-family="Inter,Arial" font-size="46" font-weight="800">${label}</text>`,
    `<text x="8%" y="62%" fill="#a5f3fc" font-family="Inter,Arial" font-size="22">${provider} mock-safe thumbnail</text>`,
    "</svg>",
  ].join("");
  const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return {
    model: payload.model ?? "gemini-2.5-flash-image",
    imageUrl,
    downloadUrl: imageUrl,
    ...dimensions,
  };
}

export class GeminiImageProvider extends BaseProvider<ImagePayload, ImageProviderData> {
  readonly definition: ProviderDefinition = {
    id: "gemini-image",
    name: "Gemini Image",
    capabilities: ["image"],
    requiredEnv: ["GEMINI_API_KEY"],
    defaultModel: "gemini-2.5-flash-image",
    docsUrl: "https://ai.google.dev/gemini-api/docs/image-generation",
  };

  protected async mock(request: ProviderRequest<ImagePayload>): Promise<ImageProviderData> {
    return placeholderImage(this.definition.name, request.payload);
  }

  protected async callProvider(request: ProviderRequest<ImagePayload>, env: ProviderEnv): Promise<ImageProviderData> {
    return generateImage({
      apiKey: env.GEMINI_API_KEY,
      prompt: request.payload.prompt,
      aspectRatio: request.payload.aspectRatio,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
