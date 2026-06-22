import { getToolProvider, toolProviders } from "@/lib/tools/tool-registry";
import type { ProviderHealthState, ToolProvider, ToolProviderId, ToolStatus } from "@/lib/tools/tool-types";

type EnvMap = Record<string, string | undefined>;

const providerHealthUpdates = new Map<ToolProviderId, { status: ToolStatus; latencyMs: number; lastChecked: string }>();

export function hasCredentials(provider: ToolProvider, env: EnvMap = {}) {
  if (provider.requiredEnv.length === 0) return true;
  return provider.requiredEnv.every((key) => Boolean(env[key]));
}

export function getProviderStatus(provider: ToolProvider, env: EnvMap = {}): ToolStatus {
  if (!hasCredentials(provider, env)) return "missing_credentials";
  if (provider.status === "quota_warning" || provider.status === "rate_limited" || provider.status === "failed") return provider.status;
  return "connected";
}

export function checkProviderHealth(providerId: ToolProviderId, env: EnvMap = {}) {
  const update = providerHealthUpdates.get(providerId);
  if (update) {
    return {
      providerId,
      status: update.status,
      health: statusToHealth(update.status),
      latencyMs: update.latencyMs,
      lastChecked: update.lastChecked,
    };
  }

  const provider = getToolProvider(providerId);
  if (!provider) {
    return {
      providerId,
      status: "failed" as ToolStatus,
      health: "failed" as ProviderHealthState,
      latencyMs: 0,
      lastChecked: new Date().toISOString(),
    };
  }

  const status = getProviderStatus(provider, env);
  return {
    providerId,
    status,
    health: statusToHealth(status),
    latencyMs: provider.latencyMs,
    lastChecked: new Date().toISOString(),
  };
}

export function getProviderHealthMatrix(env: EnvMap = {}) {
  return toolProviders.map((provider) => checkProviderHealth(provider.id, env));
}

export function recordProviderHealthUpdate(providerId: ToolProviderId, status: ToolStatus, latencyMs: number) {
  providerHealthUpdates.set(providerId, {
    status,
    latencyMs,
    lastChecked: new Date().toISOString(),
  });
}

function statusToHealth(status: ToolStatus): ProviderHealthState {
  return status === "connected"
    ? "healthy"
    : status === "quota_warning"
      ? "degraded"
      : status === "rate_limited"
        ? "rate_limited"
        : status === "missing_credentials"
          ? "missing_credentials"
          : "failed";
}
