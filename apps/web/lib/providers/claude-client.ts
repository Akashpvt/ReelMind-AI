import { ProviderError } from "@/lib/providers/provider-errors";
import { type TextClientRequest, type TextClientResponse, usageFromText, withRetry, withTimeout } from "@/lib/providers/provider-client-utils";

type ClaudeResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
};

export async function generateText(request: TextClientRequest): Promise<TextClientResponse> {
  const startedAt = Date.now();
  const input = [request.system, request.prompt].filter(Boolean).join("\n\n");

  return withRetry("claude", async () => {
    const response = await withTimeout(
      fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": request.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: request.model,
          max_tokens: 1400,
          system: request.system,
          messages: [{ role: "user", content: request.prompt }],
        }),
      }),
      request.timeoutMs ?? 30000,
      "claude",
    );
    if (!response.ok) throw new ProviderError("claude", `HTTP_${response.status}`, `Claude request failed with ${response.status}.`, response.status === 429 || response.status >= 500);
    const data = await response.json() as ClaudeResponse;
    const text = data.content?.find((item) => item.type === "text" || item.text)?.text?.trim();
    if (!text) throw new ProviderError("claude", "EMPTY_RESPONSE", "Claude returned an empty text response.", true);
    return {
      model: request.model,
      text,
      usage: {
        ...usageFromText(input, text, startedAt),
        tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) || usageFromText(input, text, startedAt).tokens,
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    };
  }, request.retries ?? 2);
}
