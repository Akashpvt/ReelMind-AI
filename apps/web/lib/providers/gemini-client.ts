import { GoogleGenAI } from "@google/genai";
import { ProviderError } from "@/lib/providers/provider-errors";
import { type TextClientRequest, type TextClientResponse, usageFromText, withRetry, withTimeout } from "@/lib/providers/provider-client-utils";

export async function generateText(request: TextClientRequest): Promise<TextClientResponse> {
  const startedAt = Date.now();
  const ai = new GoogleGenAI({ apiKey: request.apiKey });
  const contents = [request.system, request.prompt].filter(Boolean).join("\n\n");

  return withRetry("gemini", async () => {
    const response = await withTimeout(
      ai.models.generateContent({
        model: request.model,
        contents,
        config: {
          systemInstruction: request.system,
          temperature: 0.8,
        },
      }),
      request.timeoutMs ?? 30000,
      "gemini",
    );
    const text = response.text?.trim();
    if (!text) throw new ProviderError("gemini", "EMPTY_RESPONSE", "Gemini returned an empty text response.", true);
    const usageMetadata = response.usageMetadata;
    return {
      model: request.model,
      text,
      usage: {
        ...usageFromText(contents, text, startedAt),
        tokens: usageMetadata?.totalTokenCount ?? usageFromText(contents, text, startedAt).tokens,
        inputTokens: usageMetadata?.promptTokenCount,
        outputTokens: usageMetadata?.candidatesTokenCount,
      },
    };
  }, request.retries ?? 2);
}
