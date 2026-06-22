import { ProviderError } from "@/lib/providers/provider-errors";
import { estimateTokens, withRetry, withTimeout } from "@/lib/providers/provider-client-utils";
import type { ProviderId, ProviderUsage, VideoPayload } from "@/lib/providers/provider-types";

export type VideoClientRequest = {
  apiKey?: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio?: string;
  quality?: "fast" | "quality";
  style?: string;
  promptImage?: string;
  model: string;
  timeoutMs?: number;
  retries?: number;
};

export type VideoClientResponse = {
  model: string;
  videoUrl: string;
  downloadUrl: string;
  thumbnailUrl: string;
  providerJobId: string;
  prompt: string;
  durationSeconds: number;
  status: "completed";
  usage: ProviderUsage;
};

type PollOptions = {
  provider: ProviderId;
  apiKey?: string;
  jobId: string;
  pollUrl: string;
  headers?: Record<string, string>;
  intervalMs?: number;
  timeoutMs?: number;
  normalize: (payload: unknown) => { done: boolean; failed: boolean; videoUrl?: string; thumbnailUrl?: string };
};

const debugVideo = process.env.DEBUG_VIDEO === "true" || process.env.DEBUG_TOOLS === "true" || process.env.NODE_ENV === "development";

function logVideoDebug(scope: string, payload: unknown) {
  if (debugVideo) {
    console.info(`[video] ${scope}`, payload);
  }
}

export function normalizeDuration(input?: number) {
  if (input === 15 || input === 30 || input === 60) return input;
  return 30;
}

export function buildVideoPrompt(payload: VideoPayload) {
  return [
    payload.style ? `Style: ${payload.style}` : "",
    payload.quality ? `Quality mode: ${payload.quality}` : "",
    payload.aspectRatio ? `Aspect ratio: ${payload.aspectRatio}` : "",
    payload.durationSeconds ? `Duration: ${payload.durationSeconds}s` : "",
    payload.prompt,
  ].filter(Boolean).join("\n");
}

export function usageFromVideo(input: string, startedAt: number, provider: ProviderId): ProviderUsage {
  return {
    tokens: estimateTokens(input) + 280,
    credits: provider === "veo" || provider === "runway" ? 5 : 3,
    latencyMs: Date.now() - startedAt,
  };
}

export function assertVideoUrl(provider: ProviderId, url: string) {
  if (!/^https?:\/\//.test(url) && !/^data:video\//.test(url)) {
    throw new ProviderError(provider, "INVALID_VIDEO_URL", `${provider} returned an invalid video URL.`, true);
  }
}

export async function safeVideoResponseBody(response: Response) {
  const text = await response.text().catch(() => "");
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export async function pollVideoJob(options: PollOptions) {
  const timeoutMs = options.timeoutMs ?? 120000;
  const intervalMs = options.intervalMs ?? 2500;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    logVideoDebug("polling_status", { provider: options.provider, jobId: options.jobId, elapsedMs: Date.now() - started });
    const response = await withTimeout(
      fetch(options.pollUrl, {
        headers: {
          ...(options.headers ?? {}),
          ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }),
      Math.min(20000, timeoutMs),
      options.provider,
    );
    if (!response.ok) {
      const responseBody = await safeVideoResponseBody(response);
      console.warn("[video] provider_poll_error_response", {
        provider: options.provider,
        runwayEndpoint: options.provider === "runway" ? options.pollUrl : undefined,
        endpoint: options.pollUrl,
        status: response.status,
        responseBody: responseBody || "[empty response body]",
      });
      throw new ProviderError(
        options.provider,
        `HTTP_${response.status}`,
        `${options.provider} polling failed with ${response.status}${responseBody ? `: ${responseBody}` : "."}`,
        response.status === 429 || response.status >= 500,
        responseBody || null,
      );
    }
    const payload = await response.json();
    const normalized = options.normalize(payload);
    logVideoDebug("polling_response", {
      provider: options.provider,
      jobId: options.jobId,
      done: normalized.done,
      failed: normalized.failed,
      hasVideoUrl: Boolean(normalized.videoUrl),
    });
    if (normalized.failed) {
      throw new ProviderError(options.provider, "JOB_FAILED", `${options.provider} video job failed.`, true);
    }
    if (normalized.done && normalized.videoUrl) {
      logVideoDebug("polling_completed", { provider: options.provider, jobId: options.jobId });
      return {
        videoUrl: normalized.videoUrl,
        thumbnailUrl: normalized.thumbnailUrl ?? null,
      };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new ProviderError(options.provider, "TIMEOUT", `${options.provider} video job polling timed out.`, true);
}

export async function executeVideoRequest(provider: ProviderId, operation: () => Promise<VideoClientResponse>, retries = 2) {
  return withRetry(provider, operation, retries);
}

export { withTimeout };
