import type { ProviderId } from "@/lib/providers/provider-types";

export class ProviderError extends Error {
  readonly provider: ProviderId;
  readonly code: string;
  readonly retryable: boolean;
  readonly responseBody?: unknown;

  constructor(provider: ProviderId, code: string, message: string, retryable = false, responseBody?: unknown) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.code = code;
    this.retryable = retryable;
    this.responseBody = responseBody;
  }
}

export function normalizeProviderError(provider: ProviderId, error: unknown) {
  if (error instanceof ProviderError) return error;
  if (error instanceof Error) {
    const message = error.message || "Provider request failed.";
    const retryable = /timeout|rate|429|503|network|temporar/i.test(message);
    return new ProviderError(provider, retryable ? "TEMPORARY_FAILURE" : "PROVIDER_FAILURE", message, retryable);
  }
  return new ProviderError(provider, "UNKNOWN_PROVIDER_FAILURE", "Provider request failed.", false);
}
