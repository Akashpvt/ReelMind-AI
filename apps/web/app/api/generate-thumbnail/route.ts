import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ThumbnailRequest = {
  prompt?: unknown;
  title?: unknown;
  mode?: unknown;
  seed?: unknown;
  variation?: unknown;
};

type GenerationMode = "fast" | "quality" | "free";
type ImageProvider = "gemini" | "pollinations" | "placeholder";

const debugThumbnails = process.env.DEBUG_THUMBNAILS === "true";
const quotaMessage = "Thumbnail quota reached. Try again later.";
const renderTimeoutMs = 45000;
const outputWidth = 1280;
const outputHeight = 720;

function isQuotaError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status?: unknown }).status === 429
  );
}

function isTemporaryProviderError(error: unknown) {
  if (isQuotaError(error)) {
    return true;
  }

  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return status === 503 || status === 502 || status === 500;
  }

  return error instanceof TypeError || error instanceof Error;
}

function logThumbnailDebug(scope: string, error: unknown) {
  if (debugThumbnails) {
    console.warn(`[thumbnail] ${scope}`, error);
  }
}

function placeholderResponse(message: string, startedAt: number, quotaReached = false, fallbackReason?: string) {
  return NextResponse.json({
    success: false,
    error: message,
    quotaReached,
    placeholder: true,
    provider: "placeholder" satisfies ImageProvider,
    generationMs: Date.now() - startedAt,
    generationTimeMs: Date.now() - startedAt,
    fallbackReason,
  });
}

function getGenerationMode(value: unknown): GenerationMode {
  return value === "fast" || value === "free" ? value : "quality";
}

function compactPrompt(prompt: string, mode: GenerationMode) {
  const maxLength = mode === "quality" ? 900 : 480;
  const cleaned = prompt
    .replace(/[*#`_>|[\]{}]/g, " ")
    .replace(/\b(cinematic|premium|dramatic|high-contrast|ultra-detailed)\b(?:\s+\1\b)+/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`;
}

function createSeed(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(Math.floor(value));
  }

  return Math.floor(Math.random() * 2147483647);
}

function promptHash(prompt: string, seed: number) {
  return createHash("sha256").update(`${prompt}:${seed}`).digest("hex").slice(0, 24);
}

async function withTimeout<T>(task: Promise<T>, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out.`)), renderTimeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function assertImage(mimeType: string, dataUrl: string) {
  if (!mimeType.startsWith("image/") || !dataUrl.startsWith("data:image/")) {
    throw new Error("Provider returned an invalid image payload.");
  }
}

async function generateWithPollinations(prompt: string, seed: number) {
  const apiKey = process.env.POLLINATIONS_API_KEY;
  const params = new URLSearchParams({
    model: "flux",
    width: String(outputWidth),
    height: String(outputHeight),
    enhance: "false",
    seed: String(seed),
  });
  if (apiKey) {
    params.set("key", apiKey);
  }

  const response = await withTimeout(
    fetch(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params.toString()}`, {
      cache: "no-store",
    }),
    "Pollinations image generation",
  );
  if (!response.ok) {
    throw new Error(`Pollinations image request failed with ${response.status}.`);
  }

  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const data = Buffer.from(await response.arrayBuffer()).toString("base64");
  const imageUrl = `data:${mimeType};base64,${data}`;
  assertImage(mimeType, imageUrl);
  return { imageUrl, imageDataUrl: imageUrl, mimeType };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  let body: ThumbnailRequest;
  try {
    body = (await request.json()) as ThumbnailRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 2000) {
    return NextResponse.json({ error: "A valid thumbnail prompt is required." }, { status: 400 });
  }

  const mode = getGenerationMode(body.mode);
  const seed = createSeed(body.seed);
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 100) : "Reel thumbnail";
  const concisePrompt = compactPrompt(body.prompt.trim(), mode);
  const imagePrompt = [
    "Create a premium 16:9 social media reel thumbnail image.",
    "Do not add legible text, logos, watermarks, UI frames, or borders.",
    "Design for strong mobile-feed readability with a clear focal subject, dramatic lighting, and cinematic contrast.",
    `Variation seed: ${seed}.`,
    body.variation === true ? "Create a fresh variation with different composition, lighting rhythm, and subject pose while preserving the same concept." : "",
    `Creative package title: ${title}.`,
    `Image direction: ${concisePrompt}`,
  ].filter(Boolean).join("\n");
  const startedAt = Date.now();
  const hash = promptHash(imagePrompt, seed);

  if (mode === "free") {
    try {
      const image = await generateWithPollinations(imagePrompt, seed);
      return NextResponse.json({
        success: true,
        ...image,
        provider: "pollinations" satisfies ImageProvider,
        generationMs: Date.now() - startedAt,
        generationTimeMs: Date.now() - startedAt,
        seed,
        promptHash: hash,
        width: outputWidth,
        height: outputHeight,
      });
    } catch (error) {
      logThumbnailDebug("Pollinations free-mode fallback failed.", error);
      return placeholderResponse(
        "Free fallback image generation is unavailable. Showing a safe placeholder preview.",
        startedAt,
        isQuotaError(error),
        "pollinations_unavailable",
      );
    }
  }

  if (!apiKey) {
    try {
      const image = await generateWithPollinations(imagePrompt, seed);
      return NextResponse.json({
        success: true,
        ...image,
        provider: "pollinations" satisfies ImageProvider,
        generationMs: Date.now() - startedAt,
        generationTimeMs: Date.now() - startedAt,
        fallbackReason: "gemini_unconfigured",
        seed,
        promptHash: hash,
        width: outputWidth,
        height: outputHeight,
      });
    } catch (error) {
      logThumbnailDebug("Gemini missing and Pollinations fallback failed.", error);
      return placeholderResponse(
        "Image providers are unavailable. Showing a cinematic placeholder preview.",
        startedAt,
        isQuotaError(error),
        "providers_unavailable",
      );
    }
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: imagePrompt,
      }),
      "Gemini image generation",
    );

    const image = response.candidates?.[0]?.content?.parts?.find((part) => part.inlineData)?.inlineData;
    if (!image?.data || !image.mimeType) {
      throw new Error("Gemini did not return an image.");
    }

    const imageUrl = `data:${image.mimeType};base64,${image.data}`;
    assertImage(image.mimeType, imageUrl);
    return NextResponse.json({
      success: true,
      imageUrl,
      imageDataUrl: imageUrl,
      mimeType: image.mimeType,
      model: "gemini-2.5-flash-image",
      provider: "gemini" satisfies ImageProvider,
      generationMs: Date.now() - startedAt,
      generationTimeMs: Date.now() - startedAt,
      seed,
      promptHash: hash,
      width: outputWidth,
      height: outputHeight,
    });
  } catch (error) {
    if (isTemporaryProviderError(error)) {
      logThumbnailDebug("Gemini image generation failed; trying Pollinations.", error);
      try {
        const image = await generateWithPollinations(imagePrompt, seed);
        return NextResponse.json({
          success: true,
          ...image,
          provider: "pollinations" satisfies ImageProvider,
          generationMs: Date.now() - startedAt,
          generationTimeMs: Date.now() - startedAt,
          fallbackReason: isQuotaError(error) ? "gemini_quota" : "gemini_unavailable",
          seed,
          promptHash: hash,
          width: outputWidth,
          height: outputHeight,
        });
      } catch (fallbackError) {
        logThumbnailDebug("Pollinations fallback failed.", fallbackError);
        return placeholderResponse(
          isQuotaError(error) ? quotaMessage : "Image generation is busy. Showing a safe placeholder preview.",
          startedAt,
          isQuotaError(error) || isQuotaError(fallbackError),
          isQuotaError(error) ? "gemini_quota_pollinations_failed" : "providers_unavailable",
        );
      }
    }

    logThumbnailDebug("Gemini thumbnail generation failed.", error);
    return placeholderResponse(
      "Unable to generate a thumbnail image right now. Showing a placeholder preview.",
      startedAt,
      false,
      "gemini_unavailable",
    );
  }
}
