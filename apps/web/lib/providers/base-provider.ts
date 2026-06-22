import { ProviderError, normalizeProviderError } from "@/lib/providers/provider-errors";
import { hasProviderCredentials, missingEnvKeys, serverEnv } from "@/lib/providers/provider-env";
import type {
  ProviderCapability,
  ProviderDefinition,
  ProviderEnv,
  ProviderRequest,
  ProviderResult,
  ProviderUsage,
} from "@/lib/providers/provider-types";

function stableNumber(seed: string, min: number, max: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

export abstract class BaseProvider<TPayload = unknown, TData = unknown> {
  abstract readonly definition: ProviderDefinition;

  canHandle(capability: ProviderCapability) {
    return this.definition.capabilities.includes(capability);
  }

  health(env: ProviderEnv = serverEnv()) {
    const missing = missingEnvKeys(this.definition, env);
    return {
      provider: this.definition.id,
      status: missing.length ? ("missing_credentials" as const) : ("ready" as const),
      missing,
    };
  }

  async execute(request: ProviderRequest<TPayload>, env: ProviderEnv = serverEnv()): Promise<ProviderResult<TData>> {
    const startedAt = Date.now();
    try {
      if (!this.canHandle(request.capability)) {
        throw new ProviderError(this.definition.id, "UNSUPPORTED_CAPABILITY", `${this.definition.name} cannot handle ${request.capability}.`);
      }

      const mockSafe = request.mockSafe ?? true;
      if (mockSafe || !hasProviderCredentials(this.definition, env)) {
        return this.result(request, await this.mock(request), startedAt, mockSafe ? "mock_fallback" : "missing_credentials", null, true);
      }

      return this.result(request, await this.callProvider(request, env), startedAt, "ready", null, false);
    } catch (error) {
      const normalized = normalizeProviderError(this.definition.id, error);
      return this.result(request, { responseBody: normalized.responseBody ?? null } as TData, startedAt, "failed", normalized.message, false);
    }
  }

  protected usage(request: ProviderRequest<TPayload>, startedAt: number, data?: TData): ProviderUsage {
    const providerUsage = typeof data === "object" && data !== null && "usage" in data ? (data as { usage?: Partial<ProviderUsage> }).usage : null;
    const seed = `${this.definition.id}-${request.capability}-${JSON.stringify(request.payload).slice(0, 80)}`;
    return {
      tokens: providerUsage?.tokens ?? stableNumber(seed, 120, 1800),
      credits: providerUsage?.credits ?? (request.capability === "video" ? 5 : request.capability === "voice" ? 2 : 1),
      latencyMs: providerUsage?.latencyMs ?? Math.max(Date.now() - startedAt, stableNumber(seed, 80, 520)),
    };
  }

  protected result(
    request: ProviderRequest<TPayload>,
    data: TData,
    startedAt: number,
    status: ProviderResult<TData>["status"],
    error: string | null,
    mocked: boolean,
  ): ProviderResult<TData> {
    return {
      success: !error,
      provider: this.definition.id,
      capability: request.capability,
      status,
      data,
      error,
      usage: this.usage(request, startedAt, data),
      mocked,
    };
  }

  protected abstract mock(request: ProviderRequest<TPayload>): Promise<TData>;

  protected async callProvider(request: ProviderRequest<TPayload>, env: ProviderEnv): Promise<TData> {
    void request;
    void env;
    throw new ProviderError(this.definition.id, "REAL_CALL_NOT_IMPLEMENTED", `${this.definition.name} real SDK call is not enabled yet.`);
  }
}
