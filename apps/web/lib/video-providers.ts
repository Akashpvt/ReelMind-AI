import { parseProductionPack } from "@/lib/reel-generation";

export type VideoProvider = "veo" | "kling" | "runway" | "luma" | "pika" | "demo" | "placeholder";
export type VideoStatus = "queued" | "generating" | "completed" | "failed" | "placeholder" | "not_configured";
export type VideoResolution = "720p" | "1080p";
export type VideoAspectRatio = "9:16" | "16:9" | "1:1";
export type VideoDuration = 5 | 10 | 15 | 30;
export type VideoQuality = "fast" | "quality";

export type GenerateVideoPayload = {
  projectId: string;
  provider: VideoProvider;
  duration: VideoDuration;
  resolution: VideoResolution;
  aspectRatio: VideoAspectRatio;
  quality: VideoQuality;
  productionPack: string;
};

export type GenerateVideoResult = {
  success: boolean;
  provider: VideoProvider;
  status: VideoStatus;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  generationMs: number;
  message?: string;
};

const providerLabels: Record<VideoProvider, string> = {
  veo: "Veo",
  kling: "Kling",
  runway: "Runway",
  luma: "Luma",
  pika: "Pika",
  demo: "Demo",
  placeholder: "Placeholder",
};

export function normalizeVideoProvider(value: unknown): VideoProvider {
  return ["veo", "kling", "runway", "luma", "pika"].includes(String(value))
    ? (String(value) as VideoProvider)
    : "placeholder";
}

export function normalizeVideoDuration(value: unknown): VideoDuration {
  const numeric = Number(value);
  return [5, 10, 15, 30].includes(numeric) ? (numeric as VideoDuration) : 10;
}

export function normalizeVideoResolution(value: unknown): VideoResolution {
  return value === "1080p" ? "1080p" : "720p";
}

export function normalizeVideoAspectRatio(value: unknown): VideoAspectRatio {
  return value === "16:9" || value === "1:1" ? value : "9:16";
}

export function normalizeVideoQuality(value: unknown): VideoQuality {
  return value === "quality" ? "quality" : "fast";
}

function placeholderThumbnail(payload: GenerateVideoPayload) {
  const pack = parseProductionPack(payload.productionPack);
  const title = pack?.scenes[0]?.sceneTitle ?? "AI video render";
  const visual = pack?.visualStyle ?? "cinematic creator pipeline";
  const encoded = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#030712"/>
          <stop offset=".48" stop-color="#111827"/>
          <stop offset="1" stop-color="#312e81"/>
        </linearGradient>
        <radialGradient id="glow" cx=".72" cy=".24" r=".62">
          <stop offset="0" stop-color="#38bdf8" stop-opacity=".64"/>
          <stop offset=".45" stop-color="#8b5cf6" stop-opacity=".22"/>
          <stop offset="1" stop-color="#020617" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect width="1280" height="720" fill="url(#glow)"/>
      <g opacity=".35" stroke="#38bdf8" stroke-width="1">
        ${Array.from({ length: 18 }, (_, index) => `<path d="M0 ${80 + index * 34} H1280"/>`).join("")}
        ${Array.from({ length: 24 }, (_, index) => `<path d="M${40 + index * 52} 0 V720"/>`).join("")}
      </g>
      <rect x="80" y="88" width="1120" height="544" rx="44" fill="#020617" fill-opacity=".48" stroke="#ffffff" stroke-opacity=".18"/>
      <text x="118" y="168" fill="#38bdf8" font-size="28" font-family="Inter,Arial" font-weight="700" letter-spacing="6">${providerLabels[payload.provider].toUpperCase()} VIDEO STUDIO</text>
      <text x="118" y="282" fill="#f8fafc" font-size="62" font-family="Inter,Arial" font-weight="800">${title.slice(0, 32)}</text>
      <text x="118" y="352" fill="#cbd5e1" font-size="30" font-family="Inter,Arial">${visual.slice(0, 58)}</text>
      <text x="118" y="520" fill="#a78bfa" font-size="26" font-family="Inter,Arial">${payload.duration}s / ${payload.resolution} / ${payload.aspectRatio} / ${payload.quality}</text>
      <circle cx="1068" cy="186" r="46" fill="#38bdf8" fill-opacity=".18" stroke="#38bdf8" stroke-opacity=".68"/>
      <path d="M1056 165 L1094 186 L1056 207 Z" fill="#f8fafc" fill-opacity=".9"/>
    </svg>`,
  );
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

export async function generateVideo(provider: VideoProvider, payload: GenerateVideoPayload): Promise<GenerateVideoResult> {
  const startedAt = Date.now();
  const normalizedProvider = provider === "placeholder" ? "veo" : provider;

  await new Promise((resolve) => setTimeout(resolve, 850));

  return {
    success: true,
    provider: normalizedProvider,
    status: "completed",
    videoUrl: null,
    thumbnailUrl: placeholderThumbnail({ ...payload, provider: normalizedProvider }),
    duration: payload.duration,
    generationMs: Date.now() - startedAt,
    message: "MVP placeholder render generated. Real provider APIs can plug into this adapter.",
  };
}
