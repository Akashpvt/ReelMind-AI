import { BaseProvider } from "@/lib/providers/base-provider";
import { generateText } from "@/lib/providers/claude-client";
import type { ProviderDefinition, ProviderEnv, ProviderRequest, TextPayload, TextProviderData } from "@/lib/providers/provider-types";

export class ClaudeProvider extends BaseProvider<TextPayload, TextProviderData> {
  readonly definition: ProviderDefinition = {
    id: "claude",
    name: "Claude",
    capabilities: ["text", "research"],
    requiredEnv: ["CLAUDE_API_KEY"],
    defaultModel: "claude-3-5-sonnet-latest",
    docsUrl: "https://docs.anthropic.com",
  };

  protected async mock(request: ProviderRequest<TextPayload>): Promise<TextProviderData> {
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      text: `Claude mock-safe response for: ${request.payload.prompt.slice(0, 120)}`,
    };
  }

  protected async callProvider(request: ProviderRequest<TextPayload>, env: ProviderEnv): Promise<TextProviderData> {
    return generateText({
      apiKey: env.CLAUDE_API_KEY ?? env.ANTHROPIC_API_KEY ?? "",
      prompt: request.payload.prompt,
      system: request.payload.system,
      model: request.payload.model ?? this.definition.defaultModel,
      timeoutMs: request.timeoutMs,
    });
  }
}
