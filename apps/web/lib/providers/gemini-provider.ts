import { BaseProvider } from "@/lib/providers/base-provider";
import { generateText } from "@/lib/providers/gemini-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, TextPayload, TextProviderData } from "@/lib/providers/provider-types";

export class GeminiProvider extends BaseProvider<TextPayload, TextProviderData> {
  readonly definition: ProviderDefinition = {
    id: "gemini",
    name: "Gemini",
    capabilities: ["text", "research", "image", "video"],
    requiredEnv: ["GEMINI_API_KEY"],
    defaultModel: "gemini-2.5-flash",
    docsUrl: "https://ai.google.dev/gemini-api/docs",
  };

  protected async mock(request: ProviderRequest<TextPayload>): Promise<TextProviderData> {
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      text: `Gemini mock-safe response for: ${request.payload.prompt.slice(0, 120)}`,
    };
  }

  protected async callProvider(request: ProviderRequest<TextPayload>, env: ProviderEnv): Promise<TextProviderData> {
    return generateText({
      apiKey: env.GEMINI_API_KEY ?? "",
      prompt: request.payload.prompt,
      system: request.payload.system,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
