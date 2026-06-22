import { BaseProvider } from "@/lib/providers/base-provider";
import type { ProviderDefinition, ProviderRequest, TextPayload } from "@/lib/providers/provider-types";

type PerplexityData = {
  model: string;
  answer: string;
  citations: string[];
};

export class PerplexityProvider extends BaseProvider<TextPayload, PerplexityData> {
  readonly definition: ProviderDefinition = {
    id: "perplexity",
    name: "Perplexity",
    capabilities: ["research", "text"],
    requiredEnv: ["PERPLEXITY_API_KEY"],
    defaultModel: "sonar",
    docsUrl: "https://docs.perplexity.ai",
  };

  protected async mock(request: ProviderRequest<TextPayload>): Promise<PerplexityData> {
    return {
      model: request.payload.model ?? this.definition.defaultModel,
      answer: `Perplexity mock research summary for: ${request.payload.prompt.slice(0, 120)}`,
      citations: ["mock://trend-intelligence/source-1", "mock://trend-intelligence/source-2"],
    };
  }
}
