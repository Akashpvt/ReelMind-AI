export type ProviderId = "gemini" | "openai" | "claude" | "perplexity" | "gemini-image" | "openai-image" | "pollinations" | "elevenlabs" | "openai-voice" | "veo" | "runway" | "youtube" | "instagram" | "tiktok" | "facebook";

export type ProviderCapability = "text" | "research" | "image" | "voice" | "video" | "publishing";

export type ProviderStatus = "ready" | "missing_credentials" | "mock_fallback" | "failed";

export type ProviderEnv = Record<string, string | undefined>;

export type ProviderRequest<TPayload = unknown> = {
  provider?: ProviderId;
  capability: ProviderCapability;
  payload: TPayload;
  mockSafe?: boolean;
  timeoutMs?: number;
};

export type ProviderUsage = {
  tokens: number;
  inputTokens?: number;
  outputTokens?: number;
  credits: number;
  latencyMs: number;
};

export type ProviderResult<TData = unknown> = {
  success: boolean;
  provider: ProviderId;
  capability: ProviderCapability;
  status: ProviderStatus;
  data: TData;
  error: string | null;
  usage: ProviderUsage;
  mocked: boolean;
};

export type ProviderDefinition = {
  id: ProviderId;
  name: string;
  capabilities: ProviderCapability[];
  requiredEnv: string[];
  defaultModel: string;
  docsUrl: string;
};

export type TextPayload = {
  prompt: string;
  system?: string;
  model?: string;
};

export type TextProviderData = {
  model: string;
  text: string;
  usage?: ProviderUsage;
};

export type VoicePayload = {
  text: string;
  voiceId?: string;
  language?: string;
  emotion?: string;
  speed?: number;
  style?: string;
  model?: string;
};

export type VoiceProviderData = {
  model: string;
  audioUrl: string | null;
  downloadUrl: string | null;
  voiceId: string | null;
  durationMs: number;
  transcript: string;
  usage?: ProviderUsage;
};

export type VideoPayload = {
  prompt: string;
  durationSeconds?: number;
  aspectRatio?: string;
  quality?: "fast" | "quality";
  style?: string;
  model?: string;
  thumbnailUrl?: string;
};

export type VideoProviderData = {
  model: string;
  videoUrl: string | null;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
  providerJobId: string;
  prompt: string;
  durationSeconds: number;
  status: "queued" | "processing" | "completed" | "failed" | "placeholder";
  usage?: ProviderUsage;
};

export type ImagePayload = {
  prompt: string;
  aspectRatio?: string;
  style?: string;
  model?: string;
};

export type ImageProviderData = {
  model: string;
  imageUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  usage?: ProviderUsage;
};

export type PublishingPlatform = "youtube" | "instagram" | "tiktok" | "facebook";

export type PublishingPayload = {
  title: string;
  description: string;
  hashtags: string[];
  thumbnailUrl?: string;
  videoUrl?: string;
  scheduleTime?: string;
  platform: PublishingPlatform;
  mode?: "draft" | "scheduled" | "publish_now";
  oauthToken?: string;
};

export type PublishingProviderData = {
  publishId: string;
  platform: PublishingPlatform;
  status: "draft" | "scheduled" | "published" | "failed" | "package_only";
  scheduledTime: string | null;
  publishUrl: string | null;
  accountName: string | null;
  usage?: ProviderUsage;
};
