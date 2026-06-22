import { ClaudeProvider } from "@/lib/providers/claude-provider";
import { ElevenLabsProvider } from "@/lib/providers/elevenlabs-provider";
import { FacebookProvider } from "@/lib/providers/facebook-provider";
import { GeminiImageProvider } from "@/lib/providers/gemini-image-provider";
import { GeminiProvider } from "@/lib/providers/gemini-provider";
import { InstagramProvider } from "@/lib/providers/instagram-provider";
import { OpenAIImageProvider } from "@/lib/providers/openai-image-provider";
import { OpenAIVoiceProvider } from "@/lib/providers/openai-voice-provider";
import { OpenAIProvider } from "@/lib/providers/openai-provider";
import { PerplexityProvider } from "@/lib/providers/perplexity-provider";
import { PollinationsProvider } from "@/lib/providers/pollinations-provider";
import { RunwayProvider } from "@/lib/providers/runway-provider";
import { TikTokProvider } from "@/lib/providers/tiktok-provider";
import { VeoProvider } from "@/lib/providers/veo-provider";
import { YouTubeProvider } from "@/lib/providers/youtube-provider";
import type { BaseProvider } from "@/lib/providers/base-provider";
import type { ProviderCapability, ProviderEnv, ProviderId, ProviderRequest } from "@/lib/providers/provider-types";

const providers = new Map<ProviderId, BaseProvider>([
  ["gemini", new GeminiProvider()],
  ["openai", new OpenAIProvider()],
  ["claude", new ClaudeProvider()],
  ["perplexity", new PerplexityProvider()],
  ["gemini-image", new GeminiImageProvider()],
  ["openai-image", new OpenAIImageProvider()],
  ["pollinations", new PollinationsProvider()],
  ["elevenlabs", new ElevenLabsProvider()],
  ["openai-voice", new OpenAIVoiceProvider()],
  ["veo", new VeoProvider()],
  ["runway", new RunwayProvider()],
  ["youtube", new YouTubeProvider()],
  ["instagram", new InstagramProvider()],
  ["tiktok", new TikTokProvider()],
  ["facebook", new FacebookProvider()],
]);

const defaultProviderByCapability: Record<ProviderCapability, ProviderId> = {
  text: "gemini",
  research: "perplexity",
  image: "gemini-image",
  voice: "elevenlabs",
  video: "veo",
  publishing: "youtube",
};

export function getProvider(id: ProviderId) {
  return providers.get(id);
}

export function getAllProviders() {
  return Array.from(providers.values());
}

export function getProvidersByCapability(capability: ProviderCapability) {
  return getAllProviders().filter((provider) => provider.canHandle(capability));
}

export async function executeProvider<TPayload = unknown>(request: ProviderRequest<TPayload>, env?: ProviderEnv) {
  const providerId = request.provider ?? defaultProviderByCapability[request.capability];
  const provider = getProvider(providerId);
  if (!provider) {
    const fallback = getProvider(defaultProviderByCapability[request.capability]);
    return fallback?.execute(request, env) ?? null;
  }
  return provider.execute(request, env);
}
