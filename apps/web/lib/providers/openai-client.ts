import { ProviderError } from "@/lib/providers/provider-errors";
import { type TextClientRequest, type TextClientResponse, usageFromText, withRetry, withTimeout } from "@/lib/providers/provider-client-utils";

type OpenAIChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
};

export async function generateText(request: TextClientRequest): Promise<TextClientResponse> {
  const startedAt = Date.now();
  const input = [request.system, request.prompt].filter(Boolean).join("\n\n");

  return withRetry("openai", async () => {
    const response = await withTimeout(
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${request.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          messages: [
            ...(request.system ? [{ role: "system", content: request.system }] : []),
            { role: "user", content: request.prompt },
          ],
          temperature: 0.8,
        }),
      }),
      request.timeoutMs ?? 30000,
      "openai",
    );
    if (!response.ok) throw new ProviderError("openai", `HTTP_${response.status}`, `OpenAI request failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    const data = await response.json() as OpenAIChatResponse;
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new ProviderError("openai", "EMPTY_RESPONSE", "OpenAI returned an empty text response.", true);
    return {
      model: request.model,
      text,
      usage: {
        ...usageFromText(input, text, startedAt),
        tokens: data.usage?.total_tokens ?? usageFromText(input, text, startedAt).tokens,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      },
    };
  }, request.retries ?? 2);
}
