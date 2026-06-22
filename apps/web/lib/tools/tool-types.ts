import type { AgentType } from "@/lib/agents/types";

export type ToolCategory =
  | "research"
  | "text_generation"
  | "image_generation"
  | "voice_generation"
  | "video_generation"
  | "publishing"
  | "analytics";

export type ToolStatus =
  | "connected"
  | "disconnected"
  | "missing_credentials"
  | "rate_limited"
  | "quota_warning"
  | "failed";

export type ProviderHealthState = "healthy" | "degraded" | "rate_limited" | "missing_credentials" | "failed";

export type ToolProviderId =
  | "google-search"
  | "reddit"
  | "youtube-search"
  | "perplexity"
  | "gemini"
  | "openai"
  | "claude"
  | "gemini-image"
  | "openai-image"
  | "flux"
  | "ideogram"
  | "pollinations"
  | "elevenlabs"
  | "openai-voice"
  | "cartesia"
  | "veo"
  | "kling"
  | "runway"
  | "luma"
  | "pika"
  | "youtube"
  | "instagram"
  | "tiktok"
  | "facebook"
  | "youtube-analytics"
  | "instagram-insights"
  | "tiktok-analytics"
  | "facebook-insights";

export type ToolProvider = {
  id: ToolProviderId;
  name: string;
  category: ToolCategory;
  status: ToolStatus;
  requiredEnv: string[];
  fallbackProvider?: ToolProviderId;
  latencyMs: number;
  quotaUsed: number;
  quotaLimit: number;
  lastChecked: string;
};

export type ToolCallInput = {
  agentType: AgentType;
  taskType: string;
  preferredProvider?: ToolProviderId;
  payload: unknown;
};

export type ToolUsage = {
  tokens: number;
  credits: number;
  latencyMs: number;
};

export type ToolCallResult = {
  success: boolean;
  provider: ToolProviderId;
  status: ToolStatus;
  data: unknown;
  error: string | null;
  usage: ToolUsage;
};

export type ToolUsageLog = {
  id: string;
  timestamp: string;
  agent: AgentType;
  provider: ToolProviderId;
  action: string;
  status: ToolStatus;
  tokens: number;
  credits: number;
  latencyMs: number;
};

export type ToolRouteOutput<TOutput = unknown> = {
  success: boolean;
  provider: string;
  latency: number;
  credits: number;
  output: TOutput;
};

export type AgentToolMapping = {
  agentType: AgentType;
  primaryProvider: ToolProviderId;
  fallbackProvider: ToolProviderId;
  category: ToolCategory;
};
