import { ProviderError } from "@/lib/providers/provider-errors";
import { type TextClientResponse, usageFromText, withRetry, withTimeout } from "@/lib/providers/provider-client-utils";
import type { ImagePayload, ProviderId } from "@/lib/providers/provider-types";

export type ImageClientRequest = {
  apiKey?: string;
  prompt: string;
  aspectRatio?: string;
  model: string;
  timeoutMs?: number;
  retries?: number;
};

export type ImageClientResponse = {
  model: string;
  imageUrl: string;
  downloadUrl: string;
  width: number;
  height: number;
  usage: TextClientResponse["usage"];
};

export function dimensionsForAspectRatio(aspectRatio?: string) {
  if (aspectRatio === "1:1") return { width: 1024, height: 1024 };
  if (aspectRatio === "16:9") return { width: 1280, height: 720 };
  return { width: 1080, height: 1920 };
}

export function buildImagePrompt(payload: ImagePayload) {
  return [
    payload.style ? `Style: ${payload.style}` : "",
    `Aspect ratio: ${payload.aspectRatio ?? "9:16"}`,
    payload.prompt,
  ].filter(Boolean).join("\n");
}

export function assertImageResponse(provider: ProviderId, imageUrl: string) {
  if (!/^data:image\//.test(imageUrl) && !/^https?:\/\//.test(imageUrl)) {
    throw new ProviderError(provider, "INVALID_IMAGE", `${provider} returned an invalid image URL.`, true);
  }
}

export async function executeImageRequest(provider: ProviderId, operation: () => Promise<ImageClientResponse>, retries = 2) {
  return withRetry(provider, operation, retries);
}

export { usageFromText, withTimeout };
