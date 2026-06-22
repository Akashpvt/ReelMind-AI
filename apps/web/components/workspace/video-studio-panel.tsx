"use client";

import type { VideoAspectRatio, VideoDuration, VideoProvider, VideoQuality, VideoResolution, VideoStatus } from "@/lib/video-providers";

export type VideoAsset = {
  id: string;
  project_id: string;
  user_id: string;
  provider: VideoProvider;
  video_url: string | null;
  thumbnail_url: string | null;
  resolution: VideoResolution;
  aspect_ratio: VideoAspectRatio;
  quality: VideoQuality;
  duration_seconds: number;
  generation_ms: number | null;
  status: VideoStatus;
  error_message: string | null;
  created_at: string;
};

type VideoStudioPanelProps = {
  asset: VideoAsset | null;
  assets: VideoAsset[];
  isGenerating: boolean;
  canGenerate: boolean;
  provider: VideoProvider;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  duration: VideoDuration;
  quality: VideoQuality;
  manualThumbnailUrl: string;
  onProviderChange: (value: VideoProvider) => void;
  onResolutionChange: (value: VideoResolution) => void;
  onAspectRatioChange: (value: VideoAspectRatio) => void;
  onDurationChange: (value: VideoDuration) => void;
  onQualityChange: (value: VideoQuality) => void;
  onManualThumbnailUrlChange: (value: string) => void;
  onGenerate: (variation?: boolean) => void;
  onLoadAsset: (asset: VideoAsset) => void;
  onNotify: (title: string, tone: "success" | "error" | "info", description?: string) => void;
};

const providers: Array<{ value: VideoProvider; label: string }> = [
  { value: "veo", label: "Veo" },
  { value: "kling", label: "Kling" },
  { value: "runway", label: "Runway" },
  { value: "luma", label: "Luma" },
  { value: "pika", label: "Pika" },
];

const timeline = ["Storyboard", "Voiceover", "Production Pack", "Thumbnail", "Video"];

export function VideoStudioPanel({
  asset,
  assets,
  isGenerating,
  canGenerate,
  provider,
  resolution,
  aspectRatio,
  duration,
  quality,
  manualThumbnailUrl,
  onProviderChange,
  onResolutionChange,
  onAspectRatioChange,
  onDurationChange,
  onQualityChange,
  onManualThumbnailUrlChange,
  onGenerate,
  onLoadAsset,
  onNotify,
}: VideoStudioPanelProps) {
  async function copyMetadata() {
    if (!asset) return;
    await navigator.clipboard.writeText(
      JSON.stringify(
        {
          provider: asset.provider,
          status: asset.status,
          duration: asset.duration_seconds,
          resolution: asset.resolution,
          aspectRatio: asset.aspect_ratio,
          quality: asset.quality,
          videoUrl: asset.video_url,
          thumbnailUrl: asset.thumbnail_url,
          createdAt: asset.created_at,
        },
        null,
        2,
      ),
    );
    onNotify("Video metadata copied", "success", "Render settings are on your clipboard.");
  }

  async function downloadVideo() {
    if (!asset?.video_url) {
      onNotify("Video file unavailable", "info", asset?.error_message ?? "Video URL is unavailable for this render.");
      return;
    }

    try {
      const response = await fetch(asset.video_url);
      if (!response.ok) throw new Error("Video download failed.");
      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "reelmind-video-render.mp4";
      link.click();
      URL.revokeObjectURL(objectUrl);
      onNotify("Video downloaded", "success", "MP4 render saved.");
    } catch {
      onNotify("Download failed", "error", "The video asset could not be downloaded.");
    }
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Video Studio</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">AI video generation hub</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Convert your Production Pack into provider-rendered video assets with provider fallback and job tracking.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <StatusBadge status={asset?.status ?? (isGenerating ? "generating" : "placeholder")} />
          {asset?.provider ? <ProviderBadge provider={asset.provider} /> : null}
          {asset?.provider === "demo" ? <DemoBadge /> : null}
        </div>
      </div>

      <ProductionTimeline isGenerating={isGenerating} hasVideo={asset?.status === "completed"} />

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <VideoSelect label="Provider" value={provider} options={providers} onChange={(value) => onProviderChange(value as VideoProvider)} />
        <VideoSelect label="Resolution" value={resolution} options={["720p", "1080p"]} onChange={(value) => onResolutionChange(value as VideoResolution)} />
        <VideoSelect label="Aspect" value={aspectRatio} options={["9:16", "16:9", "1:1"]} onChange={(value) => onAspectRatioChange(value as VideoAspectRatio)} />
        <VideoSelect label="Duration" value={`${duration}`} options={["5", "10", "15", "30"]} onChange={(value) => onDurationChange(Number(value) as VideoDuration)} />
        <VideoSelect label="Quality" value={quality} options={["fast", "quality"]} onChange={(value) => onQualityChange(value as VideoQuality)} />
      </div>

      <label className="mt-4 block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
        Manual thumbnail image URL
        <input
          type="url"
          value={manualThumbnailUrl}
          onChange={(event) => onManualThumbnailUrlChange(event.target.value)}
          placeholder="https://example.com/thumbnail.jpg"
          className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none"
        />
      </label>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="overflow-hidden rounded-3xl border border-cyberBlue/15 bg-black/25">
          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-ink via-[#101827] to-violetGlow/20">
            {isGenerating ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-cyberBlue/15 to-transparent" />
                <span className="absolute rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-4 py-2 text-xs font-medium text-cyberBlue">
                  Rendering video...
                </span>
              </div>
            ) : asset?.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.thumbnail_url} alt="Generated video preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-5 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyberBlue/25 bg-cyberBlue/10 shadow-blue-glow">
                  <span className="h-0 w-0 border-y-[9px] border-l-[15px] border-y-transparent border-l-frost" />
                </div>
                <p className="text-lg font-semibold text-frost">No video render yet</p>
                <p className="mt-2 max-w-md text-sm leading-6 text-mist">Generate a provider-safe render asset from your Production Pack.</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-mist">
                <span>{duration}s</span>
                <span>/</span>
                <span>{resolution}</span>
                <span>/</span>
                <span>{aspectRatio}</span>
                <span>/</span>
                <span className="capitalize">{quality}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => onGenerate(false)}
              disabled={!canGenerate || isGenerating}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-4 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate Video"}
            </button>
            <button
              type="button"
              onClick={() => onGenerate(true)}
              disabled={!canGenerate || isGenerating}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-violetGlow/30 bg-violetGlow/10 px-4 text-sm font-medium text-violetGlow transition hover:border-violetGlow/50 hover:text-frost disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate Variation
            </button>
            <button
              type="button"
              onClick={() => void downloadVideo()}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-frost transition hover:border-cyberBlue/30 hover:text-cyberBlue"
            >
              Download MP4
            </button>
            <button
              type="button"
              onClick={() => void copyMetadata()}
              disabled={!asset}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-frost transition hover:border-violetGlow/30 hover:text-violetGlow disabled:cursor-not-allowed disabled:opacity-60"
            >
              Copy Metadata
            </button>
          </div>
        </div>

        <VideoHistory assets={assets} activeAssetId={asset?.id} onLoadAsset={onLoadAsset} />
      </div>
    </section>
  );
}

function ProductionTimeline({ isGenerating, hasVideo }: { isGenerating: boolean; hasVideo: boolean }) {
  return (
    <div className="mt-5 overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-2">
        {timeline.map((step, index) => {
          const isVideo = step === "Video";
          const complete = !isVideo || hasVideo;
          return (
            <div key={`video-timeline-${step}`} className="flex items-center gap-2">
              <div className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
                complete
                  ? "border-[#34D399]/25 bg-[#34D399]/10 text-[#6EE7B7]"
                  : isGenerating
                    ? "border-cyberBlue/30 bg-cyberBlue/10 text-cyberBlue"
                    : "border-white/10 bg-white/[0.04] text-mist"
              }`}>
                {complete ? "✓ " : isGenerating ? "• " : ""}
                {step}
              </div>
              {index < timeline.length - 1 ? <span className="h-px w-7 bg-gradient-to-r from-cyberBlue/40 to-violetGlow/30" /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VideoHistory({ assets, activeAssetId, onLoadAsset }: { assets: VideoAsset[]; activeAssetId?: string; onLoadAsset: (asset: VideoAsset) => void }) {
  return (
    <aside className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Video history</p>
      <div className="mt-4 max-h-[24rem] space-y-2.5 overflow-y-auto pr-1">
        {assets.length ? (
          assets.map((asset) => (
            <button
              key={asset.id}
              type="button"
              onClick={() => onLoadAsset(asset)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                activeAssetId === asset.id
                  ? "border-cyberBlue/35 bg-cyberBlue/[0.08]"
                  : "border-white/10 bg-ink/35 hover:border-cyberBlue/25 hover:bg-cyberBlue/[0.05]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <ProviderBadge provider={asset.provider} />
                <span className="text-[11px] text-mist">{new Date(asset.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-3 text-sm font-medium text-frost">{asset.duration_seconds}s / {asset.resolution}</p>
              <p className="mt-1 text-xs capitalize text-mist">{asset.status} / {asset.quality}</p>
            </button>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-mist">
            Recent video renders will appear here after generation.
          </p>
        )}
      </div>
    </aside>
  );
}

function VideoSelect({ label, value, options, onChange }: { label: string; value: string; options: string[] | Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none"
      >
        {options.map((option) => {
          const nextOption = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={`${label}-${nextOption.value}`} value={nextOption.value}>
              {nextOption.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function ProviderBadge({ provider }: { provider: VideoProvider }) {
  return (
    <span className="rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-3 py-1.5 text-[11px] font-medium capitalize text-cyberBlue">
      {provider}
    </span>
  );
}

function DemoBadge() {
  return (
    <span className="rounded-full border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-3 py-1.5 text-[11px] font-medium text-[#FDE68A]">
      Demo video generated — provider credits required for real render
    </span>
  );
}

function StatusBadge({ status }: { status: VideoStatus }) {
  return (
    <span className={`rounded-full border px-3 py-1.5 text-[11px] font-medium capitalize ${
      status === "completed"
        ? "border-[#34D399]/25 bg-[#34D399]/10 text-[#6EE7B7]"
        : status === "failed" || status === "not_configured"
          ? "border-[#FB7185]/25 bg-[#FB7185]/10 text-[#FDA4AF]"
          : "border-[#FBBF24]/25 bg-[#FBBF24]/10 text-[#FDE68A]"
    }`}>
      {status.replace("_", " ")}
    </span>
  );
}
