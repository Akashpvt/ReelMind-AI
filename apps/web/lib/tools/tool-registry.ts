import type { AgentToolMapping, ToolCategory, ToolProvider, ToolProviderId } from "@/lib/tools/tool-types";

const checkedAt = "2026-05-29T00:00:00.000Z";

export const toolProviders: ToolProvider[] = [
  provider("google-search", "Google Search", "research", ["GOOGLE_SEARCH_API_KEY", "GOOGLE_SEARCH_ENGINE_ID"], "perplexity", 380, 18),
  provider("reddit", "Reddit", "research", ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"], "google-search", 440, 12),
  provider("youtube-search", "YouTube Search", "research", ["YOUTUBE_API_KEY"], "google-search", 410, 20),
  provider("perplexity", "Perplexity", "research", ["PERPLEXITY_API_KEY"], "google-search", 520, 9),
  provider("gemini", "Gemini", "text_generation", ["GEMINI_API_KEY"], "openai", 620, 42),
  provider("openai", "OpenAI", "text_generation", ["OPENAI_API_KEY"], "claude", 590, 28),
  provider("claude", "Claude", "text_generation", ["CLAUDE_API_KEY"], "gemini", 680, 16),
  provider("gemini-image", "Gemini Image", "image_generation", ["GEMINI_API_KEY"], "openai-image", 1400, 72, "quota_warning"),
  provider("openai-image", "OpenAI Images", "image_generation", ["OPENAI_API_KEY"], "pollinations", 1280, 31),
  provider("flux", "Flux", "image_generation", ["FLUX_API_KEY"], "pollinations", 1640, 21),
  provider("ideogram", "Ideogram", "image_generation", ["IDEOGRAM_API_KEY"], "pollinations", 1510, 18),
  provider("pollinations", "Pollinations", "image_generation", [], "gemini-image", 980, 33, "connected"),
  provider("elevenlabs", "ElevenLabs", "voice_generation", ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"], "openai-voice", 1180, 24),
  provider("openai-voice", "OpenAI Voice", "voice_generation", ["OPENAI_API_KEY"], "cartesia", 1120, 15),
  provider("cartesia", "Cartesia", "voice_generation", ["CARTESIA_API_KEY"], "elevenlabs", 1060, 11),
  provider("veo", "Veo", "video_generation", ["GEMINI_API_KEY"], "runway", 2200, 6),
  provider("kling", "Kling", "video_generation", ["KLING_API_KEY"], "runway", 2300, 5),
  provider("runway", "Runway", "video_generation", ["RUNWAY_API_KEY"], "luma", 2100, 7),
  provider("luma", "Luma", "video_generation", ["LUMA_API_KEY"], "pika", 2050, 4),
  provider("pika", "Pika", "video_generation", ["PIKA_API_KEY"], "runway", 1980, 8),
  provider("youtube", "YouTube", "publishing", ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"], "instagram", 760, 13),
  provider("instagram", "Instagram", "publishing", ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"], "facebook", 800, 17),
  provider("tiktok", "TikTok", "publishing", ["TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_SECRET"], "youtube", 830, 14),
  provider("facebook", "Facebook", "publishing", ["FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"], "instagram", 790, 10),
  provider("youtube-analytics", "YouTube Analytics", "analytics", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], "instagram-insights", 540, 22),
  provider("instagram-insights", "Instagram Insights", "analytics", ["META_APP_ID", "META_APP_SECRET"], "facebook-insights", 570, 19),
  provider("tiktok-analytics", "TikTok Analytics", "analytics", ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"], "youtube-analytics", 610, 12),
  provider("facebook-insights", "Facebook Insights", "analytics", ["META_APP_ID", "META_APP_SECRET"], "instagram-insights", 560, 11),
];

export const defaultAgentToolMappings: AgentToolMapping[] = [
  { agentType: "research", primaryProvider: "google-search", fallbackProvider: "perplexity", category: "research" },
  { agentType: "script", primaryProvider: "gemini", fallbackProvider: "openai", category: "text_generation" },
  { agentType: "storyboard", primaryProvider: "gemini", fallbackProvider: "claude", category: "text_generation" },
  { agentType: "thumbnail", primaryProvider: "gemini-image", fallbackProvider: "pollinations", category: "image_generation" },
  { agentType: "voice", primaryProvider: "elevenlabs", fallbackProvider: "openai-voice", category: "voice_generation" },
  { agentType: "video", primaryProvider: "veo", fallbackProvider: "runway", category: "video_generation" },
  { agentType: "publishing", primaryProvider: "youtube", fallbackProvider: "instagram", category: "publishing" },
  { agentType: "analytics", primaryProvider: "youtube-analytics", fallbackProvider: "instagram-insights", category: "analytics" },
  { agentType: "learning", primaryProvider: "youtube-analytics", fallbackProvider: "tiktok-analytics", category: "analytics" },
];

function provider(
  id: ToolProviderId,
  name: string,
  category: ToolCategory,
  requiredEnv: string[],
  fallbackProvider: ToolProviderId,
  latencyMs: number,
  quotaUsed: number,
  status: ToolProvider["status"] = "missing_credentials",
): ToolProvider {
  return {
    id,
    name,
    category,
    status,
    requiredEnv,
    fallbackProvider,
    latencyMs,
    quotaUsed,
    quotaLimit: 100,
    lastChecked: checkedAt,
  };
}

export function getToolProvider(id: ToolProviderId) {
  return toolProviders.find((providerItem) => providerItem.id === id);
}

export function getProvidersByCategory(category: ToolCategory) {
  return toolProviders.filter((providerItem) => providerItem.category === category);
}

export function getDefaultMapping(agentType: AgentToolMapping["agentType"]) {
  return defaultAgentToolMappings.find((mapping) => mapping.agentType === agentType);
}
