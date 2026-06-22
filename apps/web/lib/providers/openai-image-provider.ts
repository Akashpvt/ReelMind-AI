import { BaseProvider } from "@/lib/providers/base-provider";
import { generateImage } from "@/lib/providers/openai-image-client";
import { dimensionsForAspectRatio } from "@/lib/providers/image-client-utils";
import type { ImagePayload, ImageProviderData, ProviderDefinition, ProviderEnv, ProviderRequest } from "@/lib/providers/provider-types";

function placeholderImage(payload: ImagePayload): ImageProviderData {
  const dimensions = dimensionsForAspectRatio(payload.aspectRatio);
  const title = encodeURIComponent(payload.prompt.slice(0, 88));
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="0 0 ${dimensions.width} ${dimensions.height}">`,
    "<defs><linearGradient id=\"g\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop stop-color=\"#050816\"/><stop offset=\"0.55\" stop-color=\"#172554\"/><stop offset=\"1\" stop-color=\"#9333ea\"/></linearGradient></defs>",
    "<rect width=\"100%\" height=\"100%\" rx=\"42\" fill=\"url(#g)\"/>",
    "<path d=\"M0 0 L100% 100%\" stroke=\"#38bdf8\" stroke-width=\"6\" opacity=\"0.2\"/>",
    `<text x="8%" y="50%" fill="#ffffff" font-family="Inter,Arial" font-size="44" font-weight="800">${title}</text>`,
    "<text x=\"8%\" y=\"61%\" fill=\"#c4b5fd\" font-family=\"Inter,Arial\" font-size=\"22\">OpenAI Images mock-safe asset</text>",
    "</svg>",
  ].join("");
  const imageUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  return {
    model: payload.model ?? "gpt-image-1",
    imageUrl,
    downloadUrl: imageUrl,
    ...dimensions,
  };
}

export class OpenAIImageProvider extends BaseProvider<ImagePayload, ImageProviderData> {
  readonly definition: ProviderDefinition = {
    id: "openai-image",
    name: "OpenAI Images",
    capabilities: ["image"],
    requiredEnv: ["OPENAI_API_KEY"],
    defaultModel: "gpt-image-1",
    docsUrl: "https://platform.openai.com/docs/guides/images",
  };

  protected async mock(request: ProviderRequest<ImagePayload>): Promise<ImageProviderData> {
    return placeholderImage(request.payload);
  }

  protected async callProvider(request: ProviderRequest<ImagePayload>, env: ProviderEnv): Promise<ImageProviderData> {
    return generateImage({
      apiKey: env.OPENAI_API_KEY,
      prompt: request.payload.prompt,
      aspectRatio: request.payload.aspectRatio,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
