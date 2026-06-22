import type { AgentType } from "@/lib/agents/types";
import type { ToolProviderId, ToolStatus, ToolUsage, ToolUsageLog } from "@/lib/tools/tool-types";

function stableNumber(seed: string, min: number, max: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

export function estimateToolUsage(provider: ToolProviderId, action: string): ToolUsage {
  const seed = `${provider}-${action}`;
  return {
    tokens: stableNumber(seed, 180, 1400),
    credits: stableNumber(seed, 1, provider.includes("video") || ["veo", "kling", "runway", "luma", "pika"].includes(provider) ? 5 : 2),
    latencyMs: stableNumber(seed, 260, 2200),
  };
}

export function createToolUsageLog(input: {
  agent: AgentType;
  provider: ToolProviderId;
  action: string;
  status: ToolStatus;
  usage: ToolUsage;
}): ToolUsageLog {
  return {
    id: `tool-log-${input.agent}-${input.provider}-${input.action}`.replace(/\s+/g, "-"),
    timestamp: new Date().toISOString(),
    agent: input.agent,
    provider: input.provider,
    action: input.action,
    status: input.status,
    tokens: input.usage.tokens,
    credits: input.usage.credits,
    latencyMs: input.usage.latencyMs,
  };
}

export function getMockUsageLogs(): ToolUsageLog[] {
  return [
    log("research", "google-search", "trend_scan", "connected"),
    log("script", "gemini", "script_generation", "missing_credentials"),
    log("thumbnail", "pollinations", "thumbnail_fallback", "connected"),
    log("voice", "elevenlabs", "voice_asset", "missing_credentials"),
    log("video", "runway", "video_placeholder", "missing_credentials"),
    log("publishing", "youtube", "publish_queue", "missing_credentials"),
    log("analytics", "youtube-analytics", "performance_sync", "missing_credentials"),
  ];
}

const runtimeUsageLogs: ToolUsageLog[] = [];

export function recordToolUsage(log: ToolUsageLog) {
  runtimeUsageLogs.unshift(log);
  runtimeUsageLogs.splice(50);
  return log;
}

export function getRuntimeUsageLogs() {
  return [...runtimeUsageLogs];
}

export function getRuntimeProviderStats(provider: ToolProviderId) {
  const providerLogs = runtimeUsageLogs.filter((log) => log.provider === provider);
  const successfulLogs = providerLogs.filter((log) => log.status === "connected" || log.status === "quota_warning");
  return {
    tokenUsage: providerLogs.reduce((total, log) => total + log.tokens, 0),
    creditUsage: providerLogs.reduce((total, log) => total + log.credits, 0),
    lastSuccessAt: successfulLogs[0]?.timestamp ?? null,
  };
}

const imageProviders = new Set<ToolProviderId>(["gemini-image", "openai-image", "pollinations", "flux", "ideogram"]);
const voiceProviders = new Set<ToolProviderId>(["elevenlabs", "openai-voice", "cartesia"]);
const videoProviders = new Set<ToolProviderId>(["veo", "runway", "kling", "luma", "pika"]);
const publishingProviders = new Set<ToolProviderId>(["youtube", "instagram", "tiktok", "facebook"]);

export function getRuntimeImageGenerationStats(provider?: ToolProviderId) {
  const imageLogs = runtimeUsageLogs.filter((log) => {
    const isImageProvider = imageProviders.has(log.provider);
    return isImageProvider && (!provider || log.provider === provider);
  });
  const successfulLogs = imageLogs.filter((log) => log.status === "connected" || log.status === "quota_warning");
  return {
    generatedImageCount: successfulLogs.length,
    lastImageSuccessAt: successfulLogs[0]?.timestamp ?? null,
  };
}

export function getRuntimeVoiceGenerationStats(provider?: ToolProviderId) {
  const voiceLogs = runtimeUsageLogs.filter((log) => {
    const isVoiceProvider = voiceProviders.has(log.provider);
    return isVoiceProvider && (!provider || log.provider === provider);
  });
  const successfulLogs = voiceLogs.filter((log) => log.status === "connected" || log.status === "quota_warning");
  const latest = successfulLogs[0] ?? null;
  return {
    generatedAudioCount: successfulLogs.length,
    lastAudioAt: latest?.timestamp ?? null,
    lastAudioProvider: latest?.provider ?? null,
  };
}

export function getRuntimeVideoGenerationStats(provider?: ToolProviderId) {
  const videoLogs = runtimeUsageLogs.filter((log) => {
    const isVideoProvider = videoProviders.has(log.provider);
    return isVideoProvider && (!provider || log.provider === provider);
  });
  const successfulLogs = videoLogs.filter((log) => log.status === "connected" || log.status === "quota_warning");
  const latest = successfulLogs[0] ?? null;
  return {
    generatedVideoCount: successfulLogs.length,
    lastRenderedVideoAt: latest?.timestamp ?? null,
    lastVideoProvider: latest?.provider ?? null,
    lastSuccessAt: latest?.timestamp ?? null,
  };
}

export function getRuntimePublishingStats(provider?: ToolProviderId) {
  const publishLogs = runtimeUsageLogs.filter((log) => {
    const isPublishingProvider = publishingProviders.has(log.provider);
    return isPublishingProvider && (!provider || log.provider === provider);
  });
  const successfulLogs = publishLogs.filter((log) => log.status === "connected" || log.status === "quota_warning");
  const failedLogs = publishLogs.filter((log) => log.status === "failed");
  const scheduledLogs = publishLogs.filter((log) => /scheduled|draft|queue/i.test(log.action));
  const latest = successfulLogs[0] ?? null;
  return {
    connectedAccounts: successfulLogs.length > 0 ? 1 : 0,
    publishCount: successfulLogs.length,
    failedPublishCount: failedLogs.length,
    scheduledQueue: scheduledLogs.length,
    lastPublishedAt: latest?.timestamp ?? null,
  };
}

function log(agent: AgentType, provider: ToolProviderId, action: string, status: ToolStatus) {
  return createToolUsageLog({
    agent,
    provider,
    action,
    status,
    usage: estimateToolUsage(provider, action),
  });
}
