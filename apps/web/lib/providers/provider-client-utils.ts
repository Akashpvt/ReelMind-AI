import { ProviderError } from "@/lib/providers/provider-errors";
import type { ProviderId, ProviderUsage } from "@/lib/providers/provider-types";

export type TextClientRequest = {
  apiKey: string;
  prompt: string;
  system?: string;
  model: string;
  timeoutMs?: number;
  retries?: number;
};

export type TextClientResponse = {
  model: string;
  text: string;
  usage: ProviderUsage;
};

export function estimateTokens(text: string) {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function isRetryableProviderError(error: unknown) {
  if (error instanceof ProviderError) return error.retryable;
  if (error instanceof TypeError) return true;
  if (!(error instanceof Error)) return false;
  return /timeout|timed out|network|fetch failed|429|503|rate|temporar|econnreset|econnrefused/i.test(error.message);
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, provider: ProviderId) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new ProviderError(provider, "TIMEOUT", `${provider} request timed out.`, true));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function withRetry<T>(provider: ProviderId, operation: () => Promise<T>, retries = 2) {
  let latestError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      latestError = error;
      if (!isRetryableProviderError(error) || attempt === retries) break;
      await new Promise((resolve) => setTimeout(resolve, [500, 1200, 2500][attempt] ?? 2500));
    }
  }
  throw latestError instanceof Error ? latestError : new ProviderError(provider, "UNKNOWN", `${provider} request failed.`);
}

export function usageFromText(input: string, output: string, startedAt: number): ProviderUsage {
  return {
    tokens: estimateTokens(input) + estimateTokens(output),
    credits: 1,
    latencyMs: Date.now() - startedAt,
  };
}
