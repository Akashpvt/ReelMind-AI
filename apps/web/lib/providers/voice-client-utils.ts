import { ProviderError } from "@/lib/providers/provider-errors";
import { estimateTokens, withRetry, withTimeout } from "@/lib/providers/provider-client-utils";
import type { ProviderId, ProviderUsage, VoicePayload } from "@/lib/providers/provider-types";

export type VoiceClientRequest = {
  apiKey?: string;
  text: string;
  voiceId?: string;
  language?: string;
  emotion?: string;
  speed?: number;
  model: string;
  timeoutMs?: number;
  retries?: number;
};

export type VoiceClientResponse = {
  model: string;
  audioUrl: string;
  downloadUrl: string;
  voiceId: string;
  durationMs: number;
  transcript: string;
  usage: ProviderUsage;
};

export function estimateDurationMs(text: string, speed = 1) {
  const safeSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  const words = Math.max(1, text.trim().split(/\s+/).filter(Boolean).length);
  return Math.max(1200, Math.round((words / (2.55 * safeSpeed)) * 1000));
}

export function buildVoicePrompt(payload: VoicePayload) {
  return [
    payload.language ? `Language: ${payload.language}` : "",
    payload.emotion ? `Emotion: ${payload.emotion}` : "",
    payload.style ? `Style: ${payload.style}` : "",
    typeof payload.speed === "number" ? `Speed: ${payload.speed}` : "",
    payload.text,
  ].filter(Boolean).join("\n");
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const maybeBuffer = (globalThis as { Buffer?: { from: (data: ArrayBuffer) => { toString: (encoding: string) => string } } }).Buffer;
  if (maybeBuffer) return maybeBuffer.from(buffer).toString("base64");

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  if (typeof btoa === "function") return btoa(binary);
  throw new ProviderError("openai-voice", "ENCODE_FAILED", "Unable to encode audio response.", true);
}

export function audioDataUrl(contentType: string, data: ArrayBuffer) {
  const mimeType = contentType || "audio/mpeg";
  return `data:${mimeType};base64,${arrayBufferToBase64(data)}`;
}

export function usageFromVoice(input: string, outputHint: string, startedAt: number): ProviderUsage {
  return {
    tokens: estimateTokens(input) + estimateTokens(outputHint),
    credits: 2,
    latencyMs: Date.now() - startedAt,
  };
}

export function assertAudioResponse(provider: ProviderId, audioUrl: string) {
  if (!/^data:audio\//.test(audioUrl) && !/^https?:\/\//.test(audioUrl)) {
    throw new ProviderError(provider, "INVALID_AUDIO", `${provider} returned an invalid audio URL.`, true);
  }
}

export async function executeVoiceRequest(provider: ProviderId, operation: () => Promise<VoiceClientResponse>, retries = 2) {
  return withRetry(provider, operation, retries);
}

export { withTimeout };
