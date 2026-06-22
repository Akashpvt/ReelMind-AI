import { ProviderError } from "@/lib/providers/provider-errors";
import { assertImageResponse, buildImagePrompt, dimensionsForAspectRatio, executeImageRequest, type ImageClientRequest, type ImageClientResponse, usageFromText, withTimeout } from "@/lib/providers/image-client-utils";

export async function generateImage(request: ImageClientRequest): Promise<ImageClientResponse> {
  const startedAt = Date.now();
  const prompt = buildImagePrompt({ prompt: request.prompt, aspectRatio: request.aspectRatio, model: request.model });
  const dimensions = dimensionsForAspectRatio(request.aspectRatio);

  return executeImageRequest("pollinations", async () => {
    const params = new URLSearchParams({
      model: request.model || "flux",
      width: String(dimensions.width),
      height: String(dimensions.height),
      enhance: "false",
      seed: String(Math.max(1, prompt.length * 97)),
    });
    if (request.apiKey) params.set("key", request.apiKey);
    const response = await withTimeout(
      fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params.toString()}`, { cache: "no-store" }),
      request.timeoutMs ?? 45000,
      "pollinations",
    );
    if (!response.ok) throw new ProviderError("pollinations", `HTTP_${response.status}`, `Pollinations request failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    const imageUrl = response.url;
    assertImageResponse("pollinations", imageUrl);
    return {
      model: request.model || "flux",
      imageUrl,
      downloadUrl: imageUrl,
      ...dimensions,
      usage: usageFromText(prompt, imageUrl, startedAt),
    };
  }, request.retries ?? 2);
}
