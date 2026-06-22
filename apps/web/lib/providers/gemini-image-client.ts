import { GoogleGenAI } from "@google/genai";
import { ProviderError } from "@/lib/providers/provider-errors";
import { assertImageResponse, buildImagePrompt, dimensionsForAspectRatio, executeImageRequest, type ImageClientRequest, type ImageClientResponse, usageFromText, withTimeout } from "@/lib/providers/image-client-utils";

export async function generateImage(request: ImageClientRequest): Promise<ImageClientResponse> {
  const startedAt = Date.now();
  const prompt = buildImagePrompt({ prompt: request.prompt, aspectRatio: request.aspectRatio, model: request.model });
  const ai = new GoogleGenAI({ apiKey: request.apiKey ?? "" });
  const dimensions = dimensionsForAspectRatio(request.aspectRatio);

  return executeImageRequest("gemini-image", async () => {
    const response = await withTimeout(
      ai.models.generateContent({
        model: request.model,
        contents: prompt,
      }),
      request.timeoutMs ?? 45000,
      "gemini-image",
    );
    const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
    if (!image?.data || !image.mimeType) throw new ProviderError("gemini-image", "EMPTY_IMAGE", "Gemini Image did not return image data.", true);
    const imageUrl = `data:${image.mimeType};base64,${image.data}`;
    assertImageResponse("gemini-image", imageUrl);
    return {
      model: request.model,
      imageUrl,
      downloadUrl: imageUrl,
      ...dimensions,
      usage: usageFromText(prompt, image.data.slice(0, 200), startedAt),
    };
  }, request.retries ?? 2);
}
