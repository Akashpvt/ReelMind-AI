import { ProviderError } from "@/lib/providers/provider-errors";
import { estimateTokens, withRetry, withTimeout } from "@/lib/providers/provider-client-utils";
import type { ProviderId, ProviderUsage, PublishingPayload } from "@/lib/providers/provider-types";

export type PublishingClientRequest = PublishingPayload & {
  apiKey?: string;
  appId?: string;
  appSecret?: string;
  timeoutMs?: number;
  retries?: number;
};

export type PublishingClientResponse = {
  publishId: string;
  platform: PublishingPayload["platform"];
  status: "draft" | "scheduled" | "published";
  scheduledTime: string | null;
  publishUrl: string | null;
  accountName: string | null;
  usage: ProviderUsage;
};

export function nowIso() {
  return new Date().toISOString();
}

export function normalizedScheduleTime(input?: string) {
  if (!input) return null;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function publishingMode(input: PublishingPayload) {
  if (input.mode) return input.mode;
  return input.scheduleTime ? "scheduled" : "publish_now";
}

export function requireOAuthToken(provider: ProviderId, oauthToken?: string) {
  if (!oauthToken) throw new ProviderError(provider, "MISSING_OAUTH_TOKEN", `${provider} requires an OAuth access token.`, true);
}

export function usageFromPublishing(input: PublishingPayload, startedAt: number): ProviderUsage {
  const hashtagText = input.hashtags.join(" ");
  return {
    tokens: estimateTokens(input.title) + estimateTokens(input.description) + estimateTokens(hashtagText),
    credits: 2,
    latencyMs: Date.now() - startedAt,
  };
}

export function fallbackPublishUrl(platform: PublishingPayload["platform"], publishId: string) {
  if (platform === "youtube") return `https://studio.youtube.com/video/${publishId}`;
  if (platform === "instagram") return `https://www.instagram.com/`;
  if (platform === "tiktok") return `https://www.tiktok.com/upload`;
  return `https://www.facebook.com/`;
}

export async function executePublishingRequest(provider: ProviderId, operation: () => Promise<PublishingClientResponse>, retries = 2) {
  return withRetry(provider, operation, retries);
}

export { withTimeout };
