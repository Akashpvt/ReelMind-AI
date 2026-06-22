import type { ProviderDefinition, ProviderEnv } from "@/lib/providers/provider-types";

export function serverEnv(): ProviderEnv {
  return {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID,
    VEO_API_KEY: process.env.VEO_API_KEY,
    RUNWAY_API_KEY: process.env.RUNWAY_API_KEY,
    POLLINATIONS_API_KEY: process.env.POLLINATIONS_API_KEY,
    YOUTUBE_CLIENT_ID: process.env.YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET: process.env.YOUTUBE_CLIENT_SECRET,
    INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID,
    INSTAGRAM_APP_SECRET: process.env.INSTAGRAM_APP_SECRET,
    TIKTOK_CLIENT_ID: process.env.TIKTOK_CLIENT_ID,
    TIKTOK_CLIENT_SECRET: process.env.TIKTOK_CLIENT_SECRET,
    FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
  };
}

export function missingEnvKeys(definition: ProviderDefinition, env: ProviderEnv = serverEnv()) {
  return definition.requiredEnv.filter((key) => !env[key]);
}

export function hasProviderCredentials(definition: ProviderDefinition, env: ProviderEnv = serverEnv()) {
  return missingEnvKeys(definition, env).length === 0;
}
