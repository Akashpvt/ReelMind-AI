import { BaseProvider } from "@/lib/providers/base-provider";
import { generateImage } from "@/lib/providers/pollinations-client";
import { dimensionsForAspectRatio } from "@/lib/providers/image-client-utils";
import type { ImagePayload, ImageProviderData, ProviderDefinition, ProviderEnv, ProviderRequest } from "@/lib/providers/provider-types";

function placeholderImage(payload: ImagePayload): ImageProviderData {
  const dimensions = dimensionsForAspectRatio(payload.aspectRatio);
  const text = encodeURIComponent(payload.prompt.slice(0, 92));
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">`,
    "<defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#03131f\"/><stop offset=\"0.48\" stop-color=\"#0f766e\"/><stop offset=\"1\" stop-color=\"#4c1d95\"/></linearGradient></defs>",
    "<rect width=\"100%\" height=\"100%\" rx=\"42\" fill=\"url(#g)\"/>",
    "<rect x=\"6%\" y=\"12%\" width=\"88%\" height=\"76%\" rx=\"34\" fill=\"#020617\" opacity=\"0.38\" stroke=\"#67e8f9\" stroke-opacity=\"0.28\"/>",
    `<text x="10%" y="50%" fill="#ecfeff" font-family="Inter,Arial" font-size="42" font-weight="800">${text}</text>`,
    "<text x=\"10%\" y=\"62%\" fill=\"#99f6e4\" font-family=\"Inter,Arial\" font-size=\"22\">Pollinations fallback thumbnail</text>",
    "</svg>",
  ].join("");
  const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return {
    model: payload.model ?? "flux",
    imageUrl,
    downloadUrl: imageUrl,
    ...dimensions,
  };
}

export class PollinationsProvider extends BaseProvider<ImagePayload, ImageProviderData> {
  readonly definition: ProviderDefinition = {
    id: "pollinations",
    name: "Pollinations",
    capabilities: ["image"],
    requiredEnv: [],
    defaultModel: "flux",
    docsUrl: "https://pollinations.ai/",
  };

  protected async mock(request: ProviderRequest<ImagePayload>): Promise<ImageProviderData> {
    return placeholderImage(request.payload);
  }

  protected async callProvider(request: ProviderRequest<ImagePayload>, env: ProviderEnv): Promise<ImageProviderData> {
    return generateImage({
      apiKey: env.POLLINATIONS_API_KEY,
      prompt: request.payload.prompt,
      aspectRatio: request.payload.aspectRatio,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
