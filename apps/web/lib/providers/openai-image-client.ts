import { ProviderError } from "@/lib/providers/provider-errors";
import { assertImageResponse, buildImagePrompt, dimensionsForAspectRatio, executeImageRequest, type ImageClientRequest, type ImageClientResponse, usageFromText, withTimeout } from "@/lib/providers/image-client-utils";

type OpenAIImageResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
};

function sizeForAspectRatio(aspectRatio?: string) {
  if (aspectRatio === "1:1") return "1024x1024";
  if (aspectRatio === "16:9") return "1536x1024";
  return "1024x1536";
}

export async function generateImage(request: ImageClientRequest): Promise<ImageClientResponse> {
  const startedAt = Date.now();
  const prompt = buildImagePrompt({ prompt: request.prompt, aspectRatio: request.aspectRatio, model: request.model });
  const dimensions = dimensionsForAspectRatio(request.aspectRatio);

  return executeImageRequest("openai-image", async () => {
    const response = await withTimeout(
      fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          prompt,
          size: sizeForAspectRatio(request.aspectRatio),
          n: 1,
        }),
      }),
      request.timeoutMs ?? 45000,
      "openai-image",
    );
    if (!response.ok) throw new ProviderError("openai-image", `HTTP_${response.status}`, `OpenAI Images request failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    const data = await response.json() as OpenAIImageResponse;
    const first = data.data?.[0];
    const imageUrl = first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : "");
    if (!imageUrl) throw new ProviderError("openai-image", "EMPTY_IMAGE", "OpenAI Images returned no image URL.", true);
    assertImageResponse("openai-image", imageUrl);
    return {
      model: request.model,
      imageUrl,
      downloadUrl: imageUrl,
      ...dimensions,
      usage: usageFromText(prompt, imageUrl, startedAt),
    };
  }, request.retries ?? 2);
}
