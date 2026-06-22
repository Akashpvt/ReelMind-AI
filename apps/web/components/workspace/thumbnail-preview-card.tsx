"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { ImageProvider } from "@/lib/reel-projects";

type ThumbnailMode = "fast" | "quality" | "free";
type ThumbnailGenerationState = "idle" | "queued" | "generating" | "provider-switching" | "completed" | "failed";

type ThumbnailAsset = {
  id: string;
  provider: ImageProvider | "failed";
  image_url: string | null;
  created_at: string;
  generation_ms: number | null;
  status: "queued" | "generating" | "completed" | "failed" | "placeholder";
  seed: number | null;
  prompt_hash: string | null;
};

type ThumbnailPreviewCardProps = {
  imageUrl: string | null;
  fallbackPrompt: string;
  errorMessage: string | null;
  isQuotaReached: boolean;
  isGenerating: boolean;
  cooldownSeconds: number;
  mode: ThumbnailMode;
  onModeChange: (mode: ThumbnailMode) => void;
  provider: ImageProvider | null;
  generationTimeMs: number | null;
  generationState: ThumbnailGenerationState;
  assets: ThumbnailAsset[];
  quotaUsedToday: number;
  quotaLimit: number;
  canGenerate: boolean;
  onGenerate: () => void;
  onGenerateVariation: () => void;
  onNotify: (title: string, tone: "success" | "error", description?: string) => void;
};

export function ThumbnailPreviewCard({
  imageUrl,
  fallbackPrompt,
  errorMessage,
  isQuotaReached,
  isGenerating,
  cooldownSeconds,
  mode,
  onModeChange,
  provider,
  generationTimeMs,
  generationState,
  assets,
  quotaUsedToday,
  quotaLimit,
  canGenerate,
  onGenerate,
  onGenerateVariation,
  onNotify,
}: ThumbnailPreviewCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const quotaReached = quotaUsedToday >= quotaLimit;
  const quotaPercentage = Math.min(100, Math.round((quotaUsedToday / quotaLimit) * 100));
  const cooldownPercentage = Math.round((cooldownSeconds / 60) * 100);
  const formattedCooldown = String(cooldownSeconds).padStart(2, "0");
  const modeHints: Record<ThumbnailMode, string> = {
    fast: "Shorter prompt, quicker Gemini pass for lightweight previews.",
    quality: "Best cinematic prompt detail through Gemini primary.",
    free: "Use the free fallback provider directly when configured.",
  };
  const providerLabel: Record<ImageProvider, string> = {
    gemini: "Gemini",
    pollinations: "Pollinations",
    placeholder: "Placeholder",
  };
  const badgeProvider = provider ?? (errorMessage ? "failed" : null);
  const badgeLabel: Record<ImageProvider | "failed", string> = {
    ...providerLabel,
    failed: "Failed",
  };
  const statusCopy: Record<ThumbnailGenerationState, string> = {
    idle: "Ready for a real image render",
    queued: "Queued render job",
    generating: "Generating with Gemini Imagen",
    "provider-switching": "Trying fallback provider if needed",
    completed: "Thumbnail render completed",
    failed: "Showing safe fallback state",
  };

  useEffect(() => {
    setIsImageLoaded(false);
  }, [imageUrl]);

  async function downloadImage(format: "png" | "jpg") {
    if (!imageUrl) {
      return;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error("Unable to fetch thumbnail.");
      }

      const blob = await response.blob();
      const exportBlob = await convertImageBlob(blob, format);
      const objectUrl = URL.createObjectURL(exportBlob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `reelmind-thumbnail.${format}`;
      link.click();
      URL.revokeObjectURL(objectUrl);
      onNotify("Thumbnail downloaded", "success", `${format.toUpperCase()} image is ready for your reel.`);
    } catch {
      onNotify("Download failed", "error", "The thumbnail could not be downloaded.");
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(fallbackPrompt);
      onNotify("Thumbnail prompt copied", "success", "Prompt is ready to reuse.");
    } catch {
      onNotify("Unable to copy prompt", "error", "Clipboard access was unavailable.");
    }
  }

  return (
    <>
      <section className="mt-4 w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-3.5 sm:mt-5 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Thumbnail asset</p>
            <p className="mt-2 text-sm text-mist">
              {imageUrl
                ? "Cached cinematic preview ready to reuse"
                : errorMessage
                  ? "Preview placeholder from your creative direction"
                  : "Generate a visual from your thumbnail prompt"}
            </p>
          </div>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {badgeProvider ? (
              <span
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                  badgeProvider === "placeholder" || badgeProvider === "failed"
                    ? "border-[#FBBF24]/25 bg-[#FBBF24]/10 text-[#FDE68A]"
                    : "border-violetGlow/20 bg-violetGlow/10 text-violetGlow"
                }`}
              >
                {badgeLabel[badgeProvider]}{generationTimeMs !== null ? ` · ${(generationTimeMs / 1000).toFixed(1)}s` : ""}
              </span>
            ) : null}
            {canGenerate ? (
              <button
                type="button"
                onClick={onGenerate}
                disabled={isGenerating || cooldownSeconds > 0 || quotaReached}
                className={`inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-4 text-xs font-medium text-cyberBlue transition hover:border-cyberBlue/45 hover:bg-cyberBlue/15 hover:text-frost disabled:cursor-not-allowed disabled:opacity-65 sm:w-auto ${
                  cooldownSeconds > 0 ? "shadow-[0_0_24px_rgba(251,191,36,0.18)]" : ""
                }`}
              >
                {isGenerating ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                    Generating
                  </>
                ) : quotaReached ? (
                  "Daily limit reached"
                ) : cooldownSeconds > 0 ? (
                  <span className="inline-flex min-w-[5.75rem] justify-center tabular-nums">
                    Retry in {formattedCooldown}s
                  </span>
                ) : imageUrl ? (
                  "Regenerate"
                ) : errorMessage || provider === "placeholder" ? (
                  "Retry thumbnail"
                ) : (
                  "Generate thumbnail"
                )}
              </button>
            ) : null}
          </div>
        </div>

        {canGenerate ? (
          <div className="mt-4 flex min-w-0 flex-col gap-2 rounded-2xl border border-cyberBlue/15 bg-cyberBlue/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyberBlue">Render state</p>
              <p className="mt-1 text-sm text-mist">{statusCopy[generationState]}</p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={copyPrompt}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-mist transition hover:border-cyberBlue/30 hover:text-cyberBlue"
              >
                Copy prompt
              </button>
              <button
                type="button"
                onClick={onGenerateVariation}
                disabled={isGenerating || cooldownSeconds > 0 || quotaReached}
                className="rounded-full border border-violetGlow/25 bg-violetGlow/10 px-3.5 py-2 text-xs font-medium text-violetGlow transition hover:border-violetGlow/40 hover:text-frost disabled:cursor-not-allowed disabled:opacity-60"
              >
                Generate Variation
              </button>
            </div>
          </div>
        ) : null}

        {canGenerate ? (
          <div className="mt-4 grid min-w-0 gap-3 rounded-2xl border border-white/[0.08] bg-ink/35 p-3 sm:grid-cols-[1fr_auto] sm:items-center sm:p-3.5">
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2 text-[11px] text-mist">
                <span className="min-w-0 break-words">Thumbnail generations used today: {quotaUsedToday}</span>
                <span className="shrink-0">{quotaLimit} max</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <motion.div
                  initial={false}
                  animate={{ width: `${quotaPercentage}%` }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full rounded-full ${quotaReached ? "bg-[#FBBF24]" : "bg-gradient-to-r from-violetGlow to-cyberBlue"}`}
                />
              </div>
            </div>
            <div className="hide-scrollbar flex w-full gap-1 overflow-x-auto rounded-full border border-white/10 bg-white/[0.04] p-1 sm:w-auto" aria-label="Thumbnail generation mode">
              {(["fast", "quality", "free"] as const).map((generationMode) => (
                <button
                  key={generationMode}
                  type="button"
                  title={modeHints[generationMode]}
                  aria-label={`${generationMode === "free" ? "Free fallback" : generationMode} mode. ${modeHints[generationMode]}`}
                  onClick={() => onModeChange(generationMode)}
                  disabled={isGenerating}
                  aria-pressed={mode === generationMode}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium capitalize transition ${
                    mode === generationMode
                      ? "bg-cyberBlue/15 text-cyberBlue shadow-[0_0_18px_rgba(56,189,248,0.14)]"
                      : "text-mist hover:text-frost"
                  }`}
                >
                  {generationMode === "free" ? "Free fallback" : generationMode}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {errorMessage ? (
          <motion.div
            initial={false}
            animate={
              isQuotaReached && cooldownSeconds > 0
                ? {
                    boxShadow: [
                      "0 0 0 rgba(251,191,36,0)",
                      "0 0 34px rgba(251,191,36,0.14)",
                      "0 0 0 rgba(251,191,36,0)",
                    ],
                  }
                : undefined
            }
            transition={{ duration: 2.4, repeat: isQuotaReached && cooldownSeconds > 0 ? Infinity : 0, ease: "easeInOut" }}
            className="relative mt-4 max-w-full overflow-hidden rounded-2xl border border-[#FBBF24]/25 bg-[#FBBF24]/[0.075] px-3.5 py-3.5 text-xs leading-5 text-[#FDE68A] backdrop-blur-xl sm:px-4"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FBBF24]/70 to-transparent" />
            <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-[#FBBF24]/10 blur-2xl" />
            <p className="relative font-semibold text-[#FEF3C7]">
              {isQuotaReached ? "Thumbnail quota reached" : "Thumbnail unavailable"}
            </p>
            {isQuotaReached ? (
              <p className="relative mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#FCD34D]">
                Free tier image quota exhausted
              </p>
            ) : null}
            <p className="relative mt-1 break-words">{errorMessage}</p>
            {isQuotaReached && cooldownSeconds > 0 ? (
              <>
                <p className="relative mt-1 tabular-nums text-[#FCD34D]">
                  Retry available in <span className="inline-block min-w-5 text-center">{formattedCooldown}</span>s.
                </p>
                <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-[#FBBF24]/15">
                  <motion.div
                    initial={false}
                    animate={{ width: `${cooldownPercentage}%` }}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className="h-full rounded-full bg-[#FBBF24]/70"
                  />
                </div>
              </>
            ) : null}
          </motion.div>
        ) : null}

        <div className="group relative mt-4 aspect-video w-full max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/70 shadow-[0_18px_58px_rgba(0,0,0,0.26)] transition hover:border-cyberBlue/25 hover:shadow-[0_22px_68px_rgba(56,189,248,0.12)]">
          {isGenerating ? (
            <div className="absolute inset-0">
              <div className="stream-skeleton h-full w-full" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4">
                <p className="text-sm font-medium text-frost">{statusCopy[generationState]}</p>
                <p className="mt-1 text-xs text-mist">Rendering light, subject, composition, and cinematic contrast</p>
              </div>
            </div>
          ) : imageUrl ? (
            <>
              <Image
                src={imageUrl}
                alt="Generated ReelMind thumbnail"
                fill
                unoptimized
                onLoad={() => setIsImageLoaded(true)}
                className={`object-cover transition duration-700 ${isImageLoaded ? "scale-100 blur-0 opacity-100" : "scale-[1.02] blur-md opacity-70"}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/72 via-transparent to-transparent opacity-80" />
              <div className="absolute inset-x-3 bottom-3 flex translate-y-1 flex-wrap justify-end gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="rounded-full border border-white/15 bg-ink/70 px-3.5 py-2 text-xs font-medium text-frost backdrop-blur-xl transition hover:border-cyberBlue/40"
                >
                  Fullscreen
                </button>
                <button
                  type="button"
                  onClick={() => void downloadImage("png")}
                  className="rounded-full border border-cyberBlue/30 bg-cyberBlue/15 px-3.5 py-2 text-xs font-medium text-cyberBlue backdrop-blur-xl transition hover:text-frost"
                >
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => void downloadImage("jpg")}
                  className="rounded-full border border-violetGlow/30 bg-violetGlow/15 px-3.5 py-2 text-xs font-medium text-violetGlow backdrop-blur-xl transition hover:text-frost"
                >
                  JPG
                </button>
              </div>
            </>
          ) : errorMessage || provider === "placeholder" ? (
            <div className="relative flex h-full flex-col justify-end overflow-hidden p-4 sm:p-5">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_24%,rgba(56,189,248,0.36),transparent_30%),radial-gradient(circle_at_22%_75%,rgba(168,85,247,0.4),transparent_40%),linear-gradient(120deg,#0b1020,#181331_45%,#071a2b)]" />
              <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
              <div className="relative rounded-xl border border-white/10 bg-ink/45 p-3.5 backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyberBlue">
                  Thumbnail concept preview
                </p>
                <p className="mt-2 line-clamp-3 break-words text-sm leading-5 text-frost/90">{fallbackPrompt}</p>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-5 text-center">
              <span className="mb-3 h-10 w-10 rounded-full border border-violetGlow/20 bg-violetGlow/10 shadow-[0_0_34px_rgba(168,85,247,0.12)]" />
              <p className="text-sm font-medium text-frost">No thumbnail generated yet</p>
              <p className="mt-2 max-w-xs text-xs leading-5 text-mist">
                Your generated thumbnail prompt becomes a ready-to-download visual here.
              </p>
            </div>
          )}
        </div>
        {assets.length ? (
          <div className="mt-4 rounded-2xl border border-white/[0.08] bg-ink/35 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyberBlue">Generation history</p>
            <div className="mt-3 grid gap-2">
              {assets.slice(0, 3).map((asset) => (
                <div key={asset.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.035] p-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium capitalize text-frost">{asset.provider} / {asset.status}</p>
                    <p className="mt-0.5 truncate text-[11px] text-mist">
                      {new Date(asset.created_at).toLocaleString()} {asset.seed ? ` / seed ${asset.seed}` : ""}
                    </p>
                  </div>
                  {asset.generation_ms !== null ? (
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-mist">
                      {(asset.generation_ms / 1000).toFixed(1)}s
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <AnimatePresence>
        {isFullscreen && imageUrl ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/90 p-4 backdrop-blur-xl sm:p-8"
          >
            <button
              type="button"
              aria-label="Close thumbnail preview"
              onClick={() => setIsFullscreen(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="relative aspect-video w-full max-w-6xl overflow-hidden rounded-2xl border border-cyberBlue/25 shadow-[0_0_90px_rgba(56,189,248,0.18)]"
            >
              <Image src={imageUrl} alt="Fullscreen generated ReelMind thumbnail" fill unoptimized className="object-contain" />
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="absolute right-3 top-3 rounded-full border border-white/15 bg-ink/75 px-4 py-2 text-xs text-frost backdrop-blur-xl"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

async function convertImageBlob(blob: Blob, format: "png" | "jpg") {
  if ((format === "png" && blob.type === "image/png") || (format === "jpg" && blob.type === "image/jpeg")) {
    return blob;
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d");
  if (!context) {
    return blob;
  }

  context.drawImage(bitmap, 0, 0);
  const mimeType = format === "png" ? "image/png" : "image/jpeg";
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((nextBlob) => resolve(nextBlob ?? blob), mimeType, format === "jpg" ? 0.92 : undefined);
  });
}
