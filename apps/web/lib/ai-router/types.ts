export type AiTextProvider = "openai" | "gemini" | "claude";
export type AiProviderSelection = AiTextProvider | "auto";
export type AiRouterInput = { organizationId?: string | null; userId?: string | null; endpoint: string; requestType: "chat" | "generate" | "health"; prompt: string; system?: string; provider?: AiProviderSelection; model?: string; promptTemplateKey?: string | null; allowFallback?: boolean; metadata?: Record<string, unknown> };
export type AiAttempt = { provider: AiTextProvider; model: string; status: "success" | "failed" | "skipped"; latencyMs: number; error?: string };
export type AiRouterResult = { requestId: string; text: string; provider: AiTextProvider; model: string; usage: { inputTokens: number; outputTokens: number; totalTokens: number; estimatedCostUsd: number; latencyMs: number; fallbackCount: number }; attempts: AiAttempt[] };
