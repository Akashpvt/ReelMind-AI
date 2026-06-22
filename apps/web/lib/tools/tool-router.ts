import { executeProvider, getProvider, serverEnv, type ImagePayload, type ProviderCapability, type ProviderEnv, type ProviderId, type ProviderResult, type PublishingPayload, type TextPayload, type VideoPayload, type VoicePayload } from "@/lib/providers";
import type { AgentType } from "@/lib/agents/types";
import { getDefaultMapping, getToolProvider } from "@/lib/tools/tool-registry";
import { checkProviderHealth, recordProviderHealthUpdate } from "@/lib/tools/tool-health";
import { createToolUsageLog, estimateToolUsage, recordToolUsage } from "@/lib/tools/tool-usage";
import type { ToolCallInput, ToolCallResult, ToolProviderId, ToolRouteOutput, ToolStatus } from "@/lib/tools/tool-types";

type EnvMap = Record<string, string | undefined>;

function providerData(provider: ToolProviderId, taskType: string, payload: unknown) {
  return {
    provider,
    taskType,
    mode: "deterministic_mock_adapter",
    payloadSummary: typeof payload === "object" && payload !== null ? Object.keys(payload as Record<string, unknown>).slice(0, 6) : String(payload).slice(0, 80),
    result: `${provider} prepared provider-ready output for ${taskType}.`,
  };
}

function placeholderResult(input: ToolCallInput): ToolCallResult {
  const provider = input.preferredProvider ?? getDefaultMapping(input.agentType)?.fallbackProvider ?? "gemini";
  return {
    success: true,
    provider,
    status: "disconnected",
    data: {
      mode: "safe_placeholder",
      result: `No connected provider is available for ${input.taskType}. Returned safe placeholder output.`,
      payload: input.payload,
    },
    error: "All configured providers are unavailable or missing credentials.",
    usage: { tokens: 0, credits: 0, latencyMs: 0 },
  };
}

export function routeToolCall(input: ToolCallInput, env: EnvMap = {}): ToolCallResult {
  const mapping = getDefaultMapping(input.agentType);
  const candidates = [
    input.preferredProvider,
    mapping?.primaryProvider,
    mapping?.fallbackProvider,
  ].filter(Boolean) as ToolProviderId[];

  const uniqueCandidates = [...new Set(candidates)];
  for (const providerId of uniqueCandidates) {
    const provider = getToolProvider(providerId);
    if (!provider) continue;
    const health = checkProviderHealth(provider.id, env);
    if (health.status === "connected" || health.status === "quota_warning") {
      const usage = estimateToolUsage(provider.id, input.taskType);
      return {
        success: true,
        provider: provider.id,
        status: health.status,
        data: providerData(provider.id, input.taskType, input.payload),
        error: null,
        usage: { ...usage, latencyMs: health.latencyMs },
      };
    }
  }

  return placeholderResult(input);
}

type RouteOptions = {
  primary?: ToolProviderId | ProviderId;
  fallback?: ToolProviderId | ProviderId;
  taskType?: string;
  env?: ProviderEnv;
  agentType?: AgentType;
  mockSafe?: boolean;
  strictProviders?: boolean;
};

const providerAliases: Partial<Record<ToolProviderId, ProviderId>> = {
  gemini: "gemini",
  openai: "openai",
  claude: "claude",
  perplexity: "perplexity",
  elevenlabs: "elevenlabs",
  "openai-voice": "openai-voice",
  veo: "veo",
  runway: "runway",
  "gemini-image": "gemini-image",
  "openai-image": "openai-image",
  flux: "pollinations",
  ideogram: "gemini-image",
  pollinations: "pollinations",
  youtube: "youtube",
  instagram: "instagram",
  tiktok: "tiktok",
  facebook: "facebook",
};

const defaultRoutes: Record<ProviderCapability, ProviderId[]> = {
  text: ["gemini", "openai", "claude"],
  research: ["perplexity", "gemini", "claude"],
  image: ["gemini-image", "openai-image", "pollinations"],
  voice: ["elevenlabs", "openai-voice"],
  video: ["veo", "runway"],
  publishing: ["youtube", "instagram", "tiktok", "facebook"],
};

function normalizeProviderId(provider?: ToolProviderId | ProviderId): ProviderId | null {
  if (!provider) return null;
  return (providerAliases[provider as ToolProviderId] ?? provider) as ProviderId;
}

async function routeProvider<TPayload, TOutput>(
  capability: ProviderCapability,
  payload: TPayload,
  options: RouteOptions = {},
): Promise<ToolRouteOutput<TOutput>> {
  const env = options.env ?? serverEnv();
  const candidates = [
    normalizeProviderId(options.primary),
    normalizeProviderId(options.fallback),
    ...(options.strictProviders ? [] : defaultRoutes[capability]),
  ].filter(Boolean) as ProviderId[];
  const uniqueCandidates = [...new Set(candidates)];
  const taskType = options.taskType ?? `${capability}_route`;
  const startedAt = Date.now();
  const attempted: ProviderId[] = [];

  for (const providerId of uniqueCandidates) {
    const provider = getProvider(providerId);
    if (!provider?.canHandle(capability)) continue;
    attempted.push(providerId);
    const health = provider.health(env);
    if (health.status !== "ready") continue;

    const result = await executeProvider<TPayload>({
      provider: providerId,
      capability,
      payload,
      mockSafe: options.mockSafe ?? true,
    }, env);
    if (result?.success) {
      return finalizeRouteResult<TOutput>(result as ProviderResult<TOutput>, taskType, [], options.agentType);
    }
    if (result) {
      finalizeRouteResult(result as ProviderResult<TOutput>, taskType, [providerId], options.agentType);
    }
  }

  const fallbackProviderId = uniqueCandidates.find((providerId) => getProvider(providerId)?.canHandle(capability)) ?? defaultRoutes[capability][0];
  const fallback = await executeProvider<TPayload>({
    provider: fallbackProviderId,
    capability,
    payload,
    mockSafe: options.mockSafe ?? true,
  }, env);

  if (fallback) {
    return finalizeRouteResult<TOutput>(fallback as ProviderResult<TOutput>, taskType, attempted, options.agentType);
  }

  return {
    success: false,
    provider: fallbackProviderId,
    latency: Date.now() - startedAt,
    credits: 0,
    output: {
      error: "No provider adapter available.",
      attempted,
    } as TOutput,
  };
}

function finalizeRouteResult<TOutput>(result: ProviderResult<TOutput>, taskType: string, attempted: ProviderId[] = [], agentType: AgentType = "script"): ToolRouteOutput<TOutput> {
  const status = providerStatusToToolStatus(result.status);
  recordProviderHealthUpdate(result.provider as ToolProviderId, status, result.usage.latencyMs);
  recordToolUsage(
    createToolUsageLog({
      agent: agentType,
      provider: result.provider as ToolProviderId,
      action: taskType,
      status,
      usage: result.usage,
    }),
  );

  return {
    success: result.success,
    provider: result.provider,
    latency: result.usage.latencyMs,
    credits: result.usage.credits,
    output: {
      ...(typeof result.data === "object" && result.data !== null ? result.data : { data: result.data }),
      attemptedProviders: attempted,
      mocked: result.mocked,
      status: result.status,
      error: result.error,
    } as TOutput,
  };
}

function providerStatusToToolStatus(status: ProviderResult["status"]): ToolStatus {
  if (status === "ready" || status === "mock_fallback") return "connected";
  if (status === "missing_credentials") return "missing_credentials";
  return "failed";
}

export function routeText(payload: TextPayload, options: RouteOptions = {}) {
  return routeProvider<TextPayload, { model?: string; text?: string; attemptedProviders?: ProviderId[]; mocked?: boolean; status?: string; error?: string | null }>(
    "text",
    payload,
    { ...options, mockSafe: options.mockSafe ?? false, taskType: options.taskType ?? "text_generation" },
  );
}

export function routeImage(payload: ImagePayload, options: RouteOptions = {}) {
  return routeProvider<ImagePayload, { model?: string; imageUrl?: string; downloadUrl?: string; width?: number; height?: number; attemptedProviders?: ProviderId[]; mocked?: boolean; status?: string; error?: string | null }>(
    "image",
    payload,
    { ...options, mockSafe: options.mockSafe ?? false, taskType: options.taskType ?? "image_generation" },
  );
}

export function routeVoice(payload: VoicePayload, options: RouteOptions = {}) {
  return routeProvider<VoicePayload, { model?: string; audioUrl?: string | null; downloadUrl?: string | null; voiceId?: string | null; durationMs?: number; transcript?: string; attemptedProviders?: ProviderId[]; mocked?: boolean; status?: string; error?: string | null }>(
    "voice",
    payload,
    { ...options, mockSafe: options.mockSafe ?? false, taskType: options.taskType ?? "voice_generation" },
  );
}

export function routeVideo(payload: VideoPayload, options: RouteOptions = {}) {
  return routeProvider<VideoPayload, { model?: string; videoUrl?: string | null; downloadUrl?: string | null; thumbnailUrl?: string | null; durationSeconds?: number; providerJobId?: string; prompt?: string; responseBody?: unknown; attemptedProviders?: ProviderId[]; mocked?: boolean; status?: string; error?: string | null }>(
    "video",
    payload,
    { ...options, mockSafe: options.mockSafe ?? false, taskType: options.taskType ?? "video_generation" },
  );
}

export function routePublishing(payload: PublishingPayload, options: RouteOptions = {}) {
  return routeProvider<PublishingPayload, { publishId?: string; platform?: string; status?: "draft" | "scheduled" | "published" | "failed" | "package_only"; scheduledTime?: string | null; publishUrl?: string | null; accountName?: string | null; attemptedProviders?: ProviderId[]; mocked?: boolean; error?: string | null }>(
    "publishing",
    payload,
    { ...options, strictProviders: options.strictProviders ?? true, mockSafe: options.mockSafe ?? false, taskType: options.taskType ?? "publishing_execute" },
  );
}
