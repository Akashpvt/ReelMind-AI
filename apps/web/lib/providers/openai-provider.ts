import { BaseProvider } from "@/lib/providers/base-provider";
import { generateText } from "@/lib/providers/openai-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, TextPayload, TextProviderData } from "@/lib/providers/provider-types";

export class OpenAIProvider extends BaseProvider<TextPayload, TextProviderData> {
  readonly definition: ProviderDefinition = {
    id: "openai",
    name: "OpenAI",
    capabilities: ["text", "image", "voice"],
    requiredEnv: ["OPENAI_API_KEY"],
    defaultModel: "gpt-4.1-mini",
    docsUrl: "https://platform.openai.com/docs",
  };

  protected async mock(request: ProviderRequest<TextPayload>): Promise<TextProviderData> {
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      text: `OpenAI mock-safe response for: ${request.payload.prompt.slice(0, 120)}`,
    };
  }

  protected async callProvider(request: ProviderRequest<TextPayload>, env: ProviderEnv): Promise<TextProviderData> {
    return generateText({
      apiKey: env.OPENAI_API_KEY ?? "",
      prompt: request.payload.prompt,
      system: request.payload.system,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
