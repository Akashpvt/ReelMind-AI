import { parseProductionPack, type GeneratedOutputs, type OutputKey, type ProductionPack } from "@/lib/reel-generation";

export type ReelExportPackage = {
  title?: string;
  prompt: string;
  category?: string;
  niche: string;
  language: string;
  duration: string;
  tone: string;
  generationModel?: string;
  status?: string;
  thumbnailUrl?: string | null;
  voiceAsset?: {
    provider: string;
    voice_name: string | null;
    voice_style: string | null;
    language: string | null;
    emotion: string | null;
    pacing: string | null;
    audio_url: string | null;
    duration_ms: number | null;
    generation_ms: number | null;
    status: string;
    created_at: string;
  } | null;
  videoAsset?: {
    provider: string;
    video_url: string | null;
    thumbnail_url: string | null;
    resolution: string;
    aspect_ratio: string;
    quality: string;
    duration_seconds: number;
    generation_ms: number | null;
    status: string;
    error_message: string | null;
    created_at: string;
  } | null;
  workspace?: {
    calendar: Array<{ title: string; platform: string; publishDate: string; status: string }>;
    library: Array<{ category: string; title: string; detail: string; updatedAt: string }>;
    score: {
      hook: number;
      retention: number;
      visualStrength: number;
      ctaQuality: number;
      overall: number;
    };
    analytics: {
      projectsCreated: number;
      videosGenerated: number;
      voiceAssets: number;
      thumbnailAssets: number;
    };
    destinations: Array<{ name: string; status: string }>;
  } | null;
  publishing?: {
    accounts: Array<{ platform: string; status: string }>;
    jobs: Array<{ platform: string; title: string; status: string; scheduledFor: string | null; timezone: string }>;
    analyticsPreview: {
      views: number;
      ctr: string;
      watchTime: string;
      retention: string;
      engagement: string;
    };
    suggestions: {
      hookScore: number;
      thumbnailScore: number;
      ctaScore: number;
      improvements: string[];
    };
  } | null;
  autoPilot?: {
    tasks: Array<{ type: string; status: string; dependsOn: string[] }>;
    optimization: {
      hookScore: number;
      ctrPrediction: number;
      retentionPrediction: number;
      viralityScore: number;
      audienceMatch: number;
    };
    bestPostingTimes: string[];
    hashtags: string[];
    titles: string[];
    readinessScore: number;
    activity: Array<{ label: string; status: string; createdAt: string }>;
  } | null;
  learningEngine?: {
    performance: Array<{
      title: string;
      hook: string;
      thumbnail: string;
      cta: string;
      views: number;
      ctr: number;
      retention: number;
      engagement: number;
      status: string;
      createdAt: string;
    }>;
    viralPatterns: string[];
    bestPerforming: {
      titles: string[];
      hooks: string[];
      thumbnails: string[];
      ctas: string[];
    };
    predictionV3: {
      reachScore: number;
      retentionScore: number;
      conversionScore: number;
      learningConfidence: number;
    };
    recommendations: string[];
    historicalAnalytics: Array<{ label: string; value: number }>;
  } | null;
  trendIntelligence?: {
    niche: string;
    trends: Array<{ keyword: string; growth: number; competition: number; opportunity: number; confidence: number }>;
    viralPatterns: Array<{ category: string; pattern: string; score: number; examples: string[] }>;
    competitors: Array<{ creator: string; avgViews: number; postingFrequency: string; hookPatterns: string[]; thumbnailPatterns: string[]; ctaPatterns: string[] }>;
    contentGaps: Array<{ topic: string; demand: number; competition: number; opportunity: number; recommendation: string }>;
    ideas: Array<{ title: string; hook: string; audience: string; viralityScore: number }>;
    activity: string[];
  } | null;
  createdAt: string;
  outputs: GeneratedOutputs;
};

const exportSections: Array<{ key: OutputKey; label: string }> = [
  { key: "hook", label: "Viral Hook" },
  { key: "script", label: "Reel Script" },
  { key: "caption", label: "Caption" },
  { key: "cta", label: "CTA" },
  { key: "videoPrompt", label: "Video Prompt" },
  { key: "thumbnailPrompt", label: "Thumbnail Prompt" },
  { key: "storyboard", label: "Storyboard" },
  { key: "voiceover", label: "Voiceover" },
  { key: "productionPack", label: "Production Pack" },
];

function fileStamp(createdAt: string) {
  return new Date(createdAt).toISOString().slice(0, 10);
}

function packageFilename(pack: ReelExportPackage, extension: "txt" | "md" | "json" | "pdf" | "zip") {
  return `reelmind-reel-package-${fileStamp(pack.createdAt)}.${extension}`;
}

export function formatReelPackageText(pack: ReelExportPackage) {
  return [
    "# ReelMind AI - Complete Reel Package",
    "",
    `Title: ${pack.title ?? "Reel Package"}`,
    `Prompt: ${pack.prompt}`,
    `Category: ${pack.category ?? pack.niche}`,
    `Niche: ${pack.niche}`,
    `Language: ${pack.language}`,
    `Tone: ${pack.tone}`,
    `Duration: ${pack.duration}`,
    `Created: ${new Date(pack.createdAt).toLocaleString()}`,
    `Generation Model: ${pack.generationModel ?? "Gemini"}`,
    pack.thumbnailUrl ? `Thumbnail Image: ${pack.thumbnailUrl}` : "",
    pack.voiceAsset ? `Voice Asset: ${pack.voiceAsset.provider} / ${pack.voiceAsset.status}` : "",
    pack.voiceAsset?.audio_url ? `Voice Audio: ${pack.voiceAsset.audio_url}` : "",
    pack.videoAsset ? `Video Asset: ${pack.videoAsset.provider} / ${pack.videoAsset.status}` : "",
    pack.videoAsset?.video_url ? `Video File: ${pack.videoAsset.video_url}` : "",
    pack.workspace ? `Creator Workspace Score: ${pack.workspace.score.overall}/100` : "",
    pack.publishing ? `Publishing Jobs: ${pack.publishing.jobs.length}` : "",
    pack.autoPilot ? `Auto-Pilot Readiness: ${pack.autoPilot.readinessScore}/100` : "",
    pack.learningEngine ? `Learning Confidence: ${pack.learningEngine.predictionV3.learningConfidence}/100` : "",
    pack.trendIntelligence ? `Trend Intelligence Niche: ${pack.trendIntelligence.niche}` : "",
    "",
    ...exportSections.flatMap((section) => [
      `## ${section.label}`,
      "",
      pack.outputs[section.key].trim(),
      "",
    ]),
  ].join("\n");
}

export function formatReelPackageMarkdown(pack: ReelExportPackage) {
  return [
    `# ${pack.title ?? "ReelMind AI Creator Package"}`,
    "",
    "| Metadata | Value |",
    "| --- | --- |",
    `| Category | ${pack.category ?? pack.niche} |`,
    `| Tone | ${pack.tone} |`,
    `| Language | ${pack.language} |`,
    `| Duration | ${pack.duration} |`,
    `| Model | ${pack.generationModel ?? "Gemini"} |`,
    ...(pack.voiceAsset
      ? [
          `| Voice Provider | ${pack.voiceAsset.provider} |`,
          `| Voice Style | ${pack.voiceAsset.voice_style ?? "Not specified"} |`,
          `| Voice Status | ${pack.voiceAsset.status} |`,
        ]
      : []),
    ...(pack.videoAsset
      ? [
          `| Video Provider | ${pack.videoAsset.provider} |`,
          `| Video Status | ${pack.videoAsset.status} |`,
          `| Video Format | ${pack.videoAsset.duration_seconds}s / ${pack.videoAsset.resolution} / ${pack.videoAsset.aspect_ratio} |`,
        ]
      : []),
    ...(pack.workspace
      ? [
          `| Workspace Score | ${pack.workspace.score.overall}/100 |`,
          `| Library Assets | ${pack.workspace.library.length} |`,
          `| Calendar Items | ${pack.workspace.calendar.length} |`,
        ]
      : []),
    ...(pack.publishing
      ? [
          `| Publishing Jobs | ${pack.publishing.jobs.length} |`,
          `| Connected Accounts | ${pack.publishing.accounts.filter((account) => account.status === "Connected").length} |`,
          `| Publishing CTR Preview | ${pack.publishing.analyticsPreview.ctr} |`,
        ]
      : []),
    ...(pack.autoPilot
      ? [
          `| Auto-Pilot Readiness | ${pack.autoPilot.readinessScore}/100 |`,
          `| Virality Score | ${pack.autoPilot.optimization.viralityScore}/100 |`,
          `| Agent Tasks | ${pack.autoPilot.tasks.length} |`,
        ]
      : []),
    ...(pack.learningEngine
      ? [
          `| Learning Confidence | ${pack.learningEngine.predictionV3.learningConfidence}/100 |`,
          `| Tracked Posts | ${pack.learningEngine.performance.length} |`,
          `| Viral Patterns | ${pack.learningEngine.viralPatterns.length} |`,
        ]
      : []),
    ...(pack.trendIntelligence
      ? [
          `| Trend Niche | ${pack.trendIntelligence.niche} |`,
          `| Trend Reports | ${pack.trendIntelligence.trends.length} |`,
          `| Content Ideas | ${pack.trendIntelligence.ideas.length} |`,
        ]
      : []),
    `| Created | ${new Date(pack.createdAt).toLocaleString()} |`,
    "",
    "## Creator Prompt",
    "",
    pack.prompt,
    "",
    ...exportSections.flatMap((section) => [
      `## ${section.label}`,
      "",
      section.key === "videoPrompt" ||
        section.key === "thumbnailPrompt" ||
        section.key === "storyboard" ||
        section.key === "voiceover" ||
        section.key === "productionPack"
        ? `\`\`\`text\n${pack.outputs[section.key].trim()}\n\`\`\``
        : pack.outputs[section.key].trim(),
      "",
    ]),
    ...(pack.thumbnailUrl ? ["## Generated Thumbnail", "", `![Generated thumbnail](${pack.thumbnailUrl})`, ""] : []),
  ].join("\n");
}

export function formatReelPackageJson(pack: ReelExportPackage) {
  return JSON.stringify(
    {
      title: pack.title ?? "Reel Package",
      prompt: pack.prompt,
      metadata: {
        category: pack.category ?? pack.niche,
        niche: pack.niche,
        tone: pack.tone,
        language: pack.language,
        duration: pack.duration,
        generationModel: pack.generationModel ?? "Gemini",
        status: pack.status ?? "generated",
        createdAt: pack.createdAt,
      },
      assets: {
        viralHook: pack.outputs.hook,
        reelScript: pack.outputs.script,
        caption: pack.outputs.caption,
        cta: pack.outputs.cta,
        videoPrompt: pack.outputs.videoPrompt,
        thumbnailPrompt: pack.outputs.thumbnailPrompt,
        storyboard: pack.outputs.storyboard,
        voiceover: pack.outputs.voiceover,
        productionPack: pack.outputs.productionPack,
        thumbnailUrl: pack.thumbnailUrl ?? null,
        voiceAsset: pack.voiceAsset
          ? {
              provider: pack.voiceAsset.provider,
              voiceName: pack.voiceAsset.voice_name,
              voiceStyle: pack.voiceAsset.voice_style,
              language: pack.voiceAsset.language,
              emotion: pack.voiceAsset.emotion,
              pacing: pack.voiceAsset.pacing,
              audioUrl: pack.voiceAsset.audio_url,
              durationMs: pack.voiceAsset.duration_ms,
              generationMs: pack.voiceAsset.generation_ms,
              status: pack.voiceAsset.status,
              createdAt: pack.voiceAsset.created_at,
            }
          : null,
        videoAsset: pack.videoAsset
          ? {
              provider: pack.videoAsset.provider,
              videoUrl: pack.videoAsset.video_url,
              thumbnailUrl: pack.videoAsset.thumbnail_url,
              resolution: pack.videoAsset.resolution,
              aspectRatio: pack.videoAsset.aspect_ratio,
              quality: pack.videoAsset.quality,
              durationSeconds: pack.videoAsset.duration_seconds,
              generationMs: pack.videoAsset.generation_ms,
              status: pack.videoAsset.status,
              createdAt: pack.videoAsset.created_at,
            }
          : null,
        workspace: pack.workspace ?? null,
        publishing: pack.publishing ?? null,
        autoPilot: pack.autoPilot ?? null,
        learningEngine: pack.learningEngine ?? null,
        trendIntelligence: pack.trendIntelligence ?? null,
      },
    },
    null,
    2,
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTextPackage(pack: ReelExportPackage) {
  const content = formatReelPackageText(pack);
  downloadBlob(new Blob([content], { type: "text/plain;charset=utf-8" }), packageFilename(pack, "txt"));
}

export function downloadMarkdownPackage(pack: ReelExportPackage) {
  downloadBlob(
    new Blob([formatReelPackageMarkdown(pack)], { type: "text/markdown;charset=utf-8" }),
    packageFilename(pack, "md"),
  );
}

export function downloadJsonPackage(pack: ReelExportPackage) {
  downloadBlob(
    new Blob([formatReelPackageJson(pack)], { type: "application/json;charset=utf-8" }),
    packageFilename(pack, "json"),
  );
}

type PageImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

const canvasWidth = 1240;
const canvasHeight = 1754;
const pageMargin = 92;
const contentWidth = canvasWidth - pageMargin * 2;

function cleanMarkdown(text: string) {
  return text
    .replace(/^```[^\n]*\n?/gm, "")
    .replace(/```$/gm, "")
    .replace(/^#{1,4}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function wrapText(context: CanvasRenderingContext2D, text: string, width: number) {
  const paragraphs = cleanMarkdown(text).replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      lines.push("");
      return;
    }

    const words = paragraph.split(/\s+/);
    let line = "";
    words.forEach((word) => {
      const nextLine = line ? `${line} ${word}` : word;
      if (context.measureText(nextLine).width <= width) {
        line = nextLine;
        return;
      }
      if (line) {
        lines.push(line);
        line = word;
      } else {
        lines.push(word);
      }
    });
    if (line) {
      lines.push(line);
    }
  });

  return lines;
}

class PackagePdfPainter {
  private pages: HTMLCanvasElement[] = [];
  private context!: CanvasRenderingContext2D;
  private y = 0;

  constructor() {
    this.newPage();
  }

  private newPage() {
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("PDF canvas could not be created.");
    }

    this.pages.push(canvas);
    this.context = context;
    this.context.fillStyle = "#080A12";
    this.context.fillRect(0, 0, canvasWidth, canvasHeight);

    const glow = this.context.createRadialGradient(canvasWidth - 120, 40, 0, canvasWidth - 120, 40, 440);
    glow.addColorStop(0, "rgba(56,189,248,0.16)");
    glow.addColorStop(1, "rgba(8,10,18,0)");
    this.context.fillStyle = glow;
    this.context.fillRect(0, 0, canvasWidth, 580);

    this.context.fillStyle = "#A5F3FC";
    this.context.font = "600 18px Inter, Arial, sans-serif";
    this.context.fillText("REELMIND AI", pageMargin, 62);
    this.context.fillStyle = "rgba(148,163,184,0.8)";
    this.context.font = "500 15px Inter, Arial, sans-serif";
    this.context.fillText("Complete reel package", pageMargin, 91);
    this.context.strokeStyle = "rgba(56,189,248,0.22)";
    this.context.beginPath();
    this.context.moveTo(pageMargin, 117);
    this.context.lineTo(canvasWidth - pageMargin, 117);
    this.context.stroke();
    this.y = 155;
  }

  private ensureSpace(height: number) {
    if (this.y + height > canvasHeight - 92) {
      this.drawFooter();
      this.newPage();
    }
  }

  private drawFooter() {
    const pageNumber = this.pages.length;
    this.context.fillStyle = "rgba(148,163,184,0.7)";
    this.context.font = "500 14px Inter, Arial, sans-serif";
    this.context.fillText("From Idea to Viral Reel in Minutes", pageMargin, canvasHeight - 42);
    this.context.textAlign = "right";
    this.context.fillText(`Page ${pageNumber}`, canvasWidth - pageMargin, canvasHeight - 42);
    this.context.textAlign = "left";
  }

  heading(title: string, subtitle: string) {
    this.ensureSpace(155);
    this.context.fillStyle = "#F8FAFC";
    this.context.font = "600 44px Inter, Arial, sans-serif";
    this.context.fillText(title, pageMargin, this.y + 42);
    this.y += 68;
    this.context.fillStyle = "#94A3B8";
    this.context.font = "400 19px Inter, Arial, sans-serif";
    wrapText(this.context, subtitle, contentWidth).forEach((line) => {
      this.context.fillText(line, pageMargin, this.y + 28);
      this.y += 30;
    });
    this.y += 28;
  }

  metadata(pack: ReelExportPackage) {
    const details = [
      ["Niche", pack.niche],
      ["Language", pack.language],
      ["Tone", pack.tone],
      ["Duration", pack.duration],
      ["Voice", pack.voiceAsset ? `${pack.voiceAsset.provider} / ${pack.voiceAsset.status}` : "Not generated"],
      ["Video", pack.videoAsset ? `${pack.videoAsset.provider} / ${pack.videoAsset.status}` : "Not generated"],
    ];
    this.ensureSpace(112);
    this.context.fillStyle = "rgba(255,255,255,0.04)";
    this.context.fillRect(pageMargin, this.y, contentWidth, 86);
    const width = contentWidth / details.length;
    details.forEach(([label, value], index) => {
      const x = pageMargin + index * width + 22;
      this.context.fillStyle = "#67E8F9";
      this.context.font = "600 12px Inter, Arial, sans-serif";
      this.context.fillText(label.toUpperCase(), x, this.y + 27);
      this.context.fillStyle = "#F8FAFC";
      this.context.font = "500 18px Inter, Arial, sans-serif";
      this.context.fillText(value, x, this.y + 59);
    });
    this.y += 122;
  }

  section(label: string, text: string, key: OutputKey) {
    this.context.font = "400 20px Inter, Noto Sans Devanagari, Nirmala UI, Arial, sans-serif";
    const lines = wrapText(this.context, text, contentWidth - 56);
    const lineHeight = key === "hook" || key === "cta" ? 35 : 32;
    const contentHeight = Math.max(56, lines.length * lineHeight + 30);
    this.ensureSpace(contentHeight + 78);

    this.context.fillStyle = key === "hook" ? "#A5F3FC" : key === "cta" ? "#67E8F9" : "#C084FC";
    this.context.font = "600 14px Inter, Arial, sans-serif";
    this.context.fillText(label.toUpperCase(), pageMargin, this.y + 16);
    this.y += 38;

    this.context.fillStyle =
      key === "hook"
        ? "rgba(139,92,246,0.12)"
        : key === "cta"
          ? "rgba(56,189,248,0.11)"
          : key === "videoPrompt" || key === "thumbnailPrompt"
            ? "rgba(4,7,16,0.72)"
            : key === "storyboard" || key === "voiceover" || key === "productionPack"
              ? "rgba(56,189,248,0.08)"
            : "rgba(255,255,255,0.025)";
    this.context.fillRect(pageMargin, this.y, contentWidth, contentHeight);
    this.context.strokeStyle =
      key === "hook" ? "rgba(168,85,247,0.38)" : key === "cta" ? "rgba(56,189,248,0.36)" : "rgba(148,163,184,0.16)";
    this.context.strokeRect(pageMargin, this.y, contentWidth, contentHeight);

    this.context.fillStyle = "#E2E8F0";
    this.context.font =
      key === "videoPrompt" ||
      key === "thumbnailPrompt" ||
      key === "storyboard" ||
      key === "voiceover" ||
      key === "productionPack"
        ? "400 18px Consolas, Noto Sans Devanagari, Nirmala UI, monospace"
        : key === "hook" || key === "cta"
          ? "500 22px Inter, Noto Sans Devanagari, Nirmala UI, Arial, sans-serif"
          : "400 20px Inter, Noto Sans Devanagari, Nirmala UI, Arial, sans-serif";
    lines.forEach((line, index) => {
      this.context.fillText(line, pageMargin + 28, this.y + 38 + index * lineHeight);
    });
    this.y += contentHeight + 40;
  }

  build(pack: ReelExportPackage) {
    this.heading("Complete Reel Package", pack.prompt);
    this.metadata(pack);
    exportSections.forEach((section) => this.section(section.label, pack.outputs[section.key], section.key));
    this.drawFooter();
    return this.pages;
  }
}

function dataUrlToBytes(dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  const binary = window.atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function encode(text: string) {
  return new TextEncoder().encode(text);
}

function joinBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function buildPdf(images: PageImage[]) {
  const parts: Uint8Array[] = [];
  const offsets: number[] = [0];
  let position = 0;
  const append = (bytes: Uint8Array) => {
    parts.push(bytes);
    position += bytes.length;
  };
  const object = (id: number, chunks: Uint8Array[]) => {
    offsets[id] = position;
    append(encode(`${id} 0 obj\n`));
    chunks.forEach(append);
    append(encode("\nendobj\n"));
  };

  append(encode("%PDF-1.4\n"));
  object(1, [encode("<< /Type /Catalog /Pages 2 0 R >>")]);
  const pageIds = images.map((_, index) => 5 + index * 3);
  object(2, [encode(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${images.length} >>`)]);

  images.forEach((image, index) => {
    const imageId = 3 + index * 3;
    const contentId = imageId + 1;
    const pageId = imageId + 2;
    const content = encode("q 595 0 0 842 0 0 cm /Im0 Do Q");
    object(imageId, [
      encode(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`),
      image.bytes,
      encode("\nendstream"),
    ]);
    object(contentId, [encode(`<< /Length ${content.length} >>\nstream\n`), content, encode("\nendstream")]);
    object(pageId, [
      encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`),
    ]);
  });

  const xrefPosition = position;
  append(encode(`xref\n0 ${offsets.length}\n0000000000 65535 f \n`));
  for (let id = 1; id < offsets.length; id += 1) {
    append(encode(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`));
  }
  append(encode(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`));
  return joinBytes(parts);
}

export async function downloadPdfPackage(pack: ReelExportPackage) {
  await document.fonts.ready;
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  const painter = new PackagePdfPainter();
  const canvases = painter.build(pack);
  const images = canvases.map((canvas) => ({
    bytes: dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.94)),
    width: canvas.width,
    height: canvas.height,
  }));
  const pdf = buildPdf(images);
  downloadBlob(new Blob([pdf], { type: "application/pdf" }), packageFilename(pack, "pdf"));
}

type ZipFile = {
  name: string;
  bytes: Uint8Array;
};

const crcTable = Array.from({ length: 256 }, (_, tableIndex) => {
  let value = tableIndex;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeUint32(bytes: number[], value: number) {
  bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function zipDateParts(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosDate, dosTime };
}

function buildZip(files: ZipFile[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const { dosDate, dosTime } = zipDateParts(new Date());

  files.forEach((file) => {
    const nameBytes = encode(file.name);
    const checksum = crc32(file.bytes);
    const localHeader: number[] = [];

    writeUint32(localHeader, 0x04034b50);
    writeUint16(localHeader, 20);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, 0);
    writeUint16(localHeader, dosTime);
    writeUint16(localHeader, dosDate);
    writeUint32(localHeader, checksum);
    writeUint32(localHeader, file.bytes.length);
    writeUint32(localHeader, file.bytes.length);
    writeUint16(localHeader, nameBytes.length);
    writeUint16(localHeader, 0);

    const localFile = joinBytes([new Uint8Array(localHeader), nameBytes, file.bytes]);
    localParts.push(localFile);

    const centralHeader: number[] = [];
    writeUint32(centralHeader, 0x02014b50);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 20);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, dosTime);
    writeUint16(centralHeader, dosDate);
    writeUint32(centralHeader, checksum);
    writeUint32(centralHeader, file.bytes.length);
    writeUint32(centralHeader, file.bytes.length);
    writeUint16(centralHeader, nameBytes.length);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint16(centralHeader, 0);
    writeUint32(centralHeader, 0);
    writeUint32(centralHeader, offset);
    centralParts.push(joinBytes([new Uint8Array(centralHeader), nameBytes]));

    offset += localFile.length;
  });

  const centralDirectory = joinBytes(centralParts);
  const endRecord: number[] = [];
  writeUint32(endRecord, 0x06054b50);
  writeUint16(endRecord, 0);
  writeUint16(endRecord, 0);
  writeUint16(endRecord, files.length);
  writeUint16(endRecord, files.length);
  writeUint32(endRecord, centralDirectory.length);
  writeUint32(endRecord, offset);
  writeUint16(endRecord, 0);

  return joinBytes([...localParts, centralDirectory, new Uint8Array(endRecord)]);
}

function outputFileName(key: OutputKey) {
  const fileNames: Record<OutputKey, string> = {
    hook: "hook.txt",
    script: "script.txt",
    caption: "caption.txt",
    cta: "cta.txt",
    videoPrompt: "video-prompt.txt",
    thumbnailPrompt: "thumbnail-prompt.txt",
    storyboard: "storyboard.json",
    voiceover: "voiceover.json",
    productionPack: "production-pack.json",
  };
  return fileNames[key];
}

function imageExtensionFromResponse(response: Response, url: string) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase();
  return extension && ["png", "jpg", "jpeg", "webp"].includes(extension) ? extension.replace("jpeg", "jpg") : "png";
}

async function loadThumbnailZipFile(pack: ReelExportPackage): Promise<ZipFile> {
  if (!pack.thumbnailUrl) {
    return {
      name: "thumbnail-placeholder.txt",
      bytes: encode(`No generated thumbnail image was attached.\n\nThumbnail prompt:\n${pack.outputs.thumbnailPrompt}`),
    };
  }

  try {
    const response = await fetch(pack.thumbnailUrl, { mode: "cors" });
    if (!response.ok) {
      throw new Error("Thumbnail download failed.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return {
      name: `thumbnail.${imageExtensionFromResponse(response, pack.thumbnailUrl)}`,
      bytes,
    };
  } catch {
    return {
      name: "thumbnail-placeholder.txt",
      bytes: encode(
        [
          "A generated thumbnail image exists, but this browser could not include it in the ZIP.",
          "",
          `Thumbnail URL: ${pack.thumbnailUrl}`,
          "",
          `Thumbnail prompt: ${pack.outputs.thumbnailPrompt}`,
        ].join("\n"),
      ),
    };
  }
}

async function loadProductionThumbnailFiles(pack: ReelExportPackage): Promise<ZipFile[]> {
  const metadata = {
    title: pack.title ?? "ReelMind Thumbnail",
    thumbnailUrl: pack.thumbnailUrl ?? null,
    prompt: pack.outputs.thumbnailPrompt,
    exportedAt: new Date().toISOString(),
  };

  const baseFiles: ZipFile[] = [
    { name: "production-pack/thumbnail-prompt.txt", bytes: encode(pack.outputs.thumbnailPrompt) },
    { name: "production-pack/metadata.json", bytes: encode(JSON.stringify(metadata, null, 2)) },
  ];

  if (!pack.thumbnailUrl) {
    return [
      ...baseFiles,
      {
        name: "production-pack/thumbnail-placeholder.txt",
        bytes: encode(`No rendered thumbnail image was attached.\n\n${pack.outputs.thumbnailPrompt}`),
      },
    ];
  }

  try {
    const response = await fetch(pack.thumbnailUrl, { mode: "cors" });
    if (!response.ok) {
      throw new Error("Thumbnail download failed.");
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    return [
      ...baseFiles,
      {
        name: `production-pack/thumbnail.${imageExtensionFromResponse(response, pack.thumbnailUrl)}`,
        bytes,
      },
    ];
  } catch {
    return [
      ...baseFiles,
      {
        name: "production-pack/thumbnail-placeholder.txt",
        bytes: encode(`Thumbnail could not be included in this ZIP.\n\nURL: ${pack.thumbnailUrl}`),
      },
    ];
  }
}

function formatDirectorPack(pack: ProductionPack) {
  return [
    "# Director Pack",
    "",
    `## Master Direction\n${pack.masterDirection}`,
    "",
    `## Visual Style\n${pack.visualStyle}`,
    "",
    `## Color Palette\n${pack.colorPalette}`,
    "",
    `## Lighting Style\n${pack.lightingStyle}`,
    "",
    `## Camera Language\n${pack.cameraLanguage}`,
    "",
    `## Pacing Notes\n${pack.pacingNotes}`,
    "",
    `## Continuity Rules\n${pack.continuityRules}`,
    "",
  ].join("\n");
}

function formatCharacterConsistency(pack: ProductionPack) {
  return [
    "# Character Consistency",
    "",
    `## Character Profile\n${pack.characterProfile}`,
    "",
    `## Wardrobe\n${pack.wardrobe}`,
    "",
    `## Continuity Rules\n${pack.continuityRules}`,
    "",
    ...pack.scenes.flatMap((scene) => [
      `## Scene ${scene.sceneNumber}: ${scene.sceneTitle}`,
      scene.characterConsistency,
      "",
    ]),
  ].join("\n");
}

function providerPromptFile(pack: ProductionPack, key: "veoPrompt" | "klingPrompt" | "runwayPrompt" | "pikaPrompt" | "lumaPrompt") {
  return pack.scenes
    .flatMap((scene) => [
      `Scene ${scene.sceneNumber} - ${scene.timestamp} - ${scene.sceneTitle}`,
      scene[key],
      "",
      `Camera: ${scene.cameraMotion} | Lens: ${scene.lens} | Lighting: ${scene.lighting}`,
      "",
      "---",
      "",
    ])
    .join("\n");
}

function negativePromptFile(pack: ProductionPack) {
  return pack.scenes
    .flatMap((scene) => [
      `Scene ${scene.sceneNumber} - ${scene.sceneTitle}`,
      scene.negativePrompt,
      "",
    ])
    .join("\n");
}

function narrationText(pack: ReelExportPackage) {
  try {
    const parsed = JSON.parse(pack.outputs.voiceover) as { scriptBeats?: Array<{ line?: string; pauseAfter?: string; emotion?: string }> };
    if (Array.isArray(parsed.scriptBeats)) {
      return parsed.scriptBeats
        .map((beat) => `${beat.emotion ? `(${beat.emotion}) ` : ""}${beat.line ?? ""}${beat.pauseAfter ? ` [pause ${beat.pauseAfter}]` : ""}`)
        .join("\n")
        .trim();
    }
  } catch {
    // Fall back to raw voiceover below.
  }
  return pack.outputs.voiceover;
}

async function voiceoverZipFiles(pack: ReelExportPackage): Promise<ZipFile[]> {
  const metadata = {
    provider: pack.voiceAsset?.provider ?? null,
    voiceName: pack.voiceAsset?.voice_name ?? null,
    voiceStyle: pack.voiceAsset?.voice_style ?? null,
    language: pack.voiceAsset?.language ?? pack.language,
    emotion: pack.voiceAsset?.emotion ?? null,
    pacing: pack.voiceAsset?.pacing ?? null,
    audioUrl: pack.voiceAsset?.audio_url ?? null,
    durationMs: pack.voiceAsset?.duration_ms ?? null,
    generationMs: pack.voiceAsset?.generation_ms ?? null,
    status: pack.voiceAsset?.status ?? "not_generated",
    createdAt: pack.voiceAsset?.created_at ?? null,
  };

  const files: ZipFile[] = [
    { name: "voiceover/narration.txt", bytes: encode(narrationText(pack)) },
    {
      name: "voiceover/voice-settings.json",
      bytes: encode(JSON.stringify({
        voiceStyle: metadata.voiceStyle,
        language: metadata.language,
        emotion: metadata.emotion,
        pacing: metadata.pacing,
      }, null, 2)),
    },
    { name: "voiceover/voice-asset-metadata.json", bytes: encode(JSON.stringify(metadata, null, 2)) },
  ];

  if (!pack.voiceAsset?.audio_url) {
    return files;
  }

  try {
    const response = await fetch(pack.voiceAsset.audio_url, { mode: "cors" });
    if (!response.ok) throw new Error("Audio download failed.");
    files.push({ name: "voiceover/narration.mp3", bytes: new Uint8Array(await response.arrayBuffer()) });
  } catch {
    files.push({
      name: "voiceover/audio-unavailable.txt",
      bytes: encode(`Audio could not be included in this ZIP.\n\nURL: ${pack.voiceAsset.audio_url}`),
    });
  }

  return files;
}

async function videoZipFiles(pack: ReelExportPackage): Promise<ZipFile[]> {
  const metadata = {
    provider: pack.videoAsset?.provider ?? null,
    videoUrl: pack.videoAsset?.video_url ?? null,
    thumbnailUrl: pack.videoAsset?.thumbnail_url ?? null,
    resolution: pack.videoAsset?.resolution ?? null,
    aspectRatio: pack.videoAsset?.aspect_ratio ?? null,
    quality: pack.videoAsset?.quality ?? null,
    durationSeconds: pack.videoAsset?.duration_seconds ?? null,
    generationMs: pack.videoAsset?.generation_ms ?? null,
    status: pack.videoAsset?.status ?? "not_generated",
    createdAt: pack.videoAsset?.created_at ?? null,
  };

  const files: ZipFile[] = [
    { name: "video/metadata.json", bytes: encode(JSON.stringify(metadata, null, 2)) },
    { name: "video/prompts.txt", bytes: encode(pack.outputs.productionPack.trim() || pack.outputs.videoPrompt.trim()) },
  ];

  if (pack.videoAsset?.thumbnail_url) {
    try {
      const response = await fetch(pack.videoAsset.thumbnail_url, { mode: "cors" });
      if (!response.ok) throw new Error("Video thumbnail download failed.");
      files.push({ name: `video/thumbnail.${imageExtensionFromResponse(response, pack.videoAsset.thumbnail_url)}`, bytes: new Uint8Array(await response.arrayBuffer()) });
    } catch {
      files.push({
        name: "video/thumbnail-unavailable.txt",
        bytes: encode(`Video thumbnail could not be included.\n\nURL: ${pack.videoAsset.thumbnail_url}`),
      });
    }
  }

  if (pack.videoAsset?.video_url) {
    try {
      const response = await fetch(pack.videoAsset.video_url, { mode: "cors" });
      if (!response.ok) throw new Error("Video download failed.");
      files.push({ name: "video/video.mp4", bytes: new Uint8Array(await response.arrayBuffer()) });
      return files;
    } catch {
      files.push({
        name: "video/video-unavailable.txt",
        bytes: encode(`Video could not be included.\n\nURL: ${pack.videoAsset.video_url}`),
      });
      return files;
    }
  }

  files.push({
    name: "video/placeholder.txt",
    bytes: encode("No MP4 video file is available yet. The current Video Studio MVP stores provider metadata and preview thumbnails until real provider APIs are connected."),
  });
  return files;
}

function workspaceZipFiles(pack: ReelExportPackage): ZipFile[] {
  if (!pack.workspace) {
    return [
      {
        name: "workspace.json",
        bytes: encode(JSON.stringify({ status: "not_available" }, null, 2)),
      },
    ];
  }

  return [
    { name: "workspace.json", bytes: encode(JSON.stringify(pack.workspace, null, 2)) },
    {
      name: "content-library/library.json",
      bytes: encode(JSON.stringify(pack.workspace.library, null, 2)),
    },
    {
      name: "content-library/library.md",
      bytes: encode(
        [
          "# ReelMind Content Library",
          "",
          ...pack.workspace.library.flatMap((item) => [
            `## ${item.category}: ${item.title}`,
            "",
            item.detail,
            "",
            `Updated: ${item.updatedAt}`,
            "",
          ]),
        ].join("\n"),
      ),
    },
    {
      name: "analytics/usage-summary.json",
      bytes: encode(JSON.stringify(pack.workspace.analytics, null, 2)),
    },
    {
      name: "analytics/content-score.json",
      bytes: encode(JSON.stringify(pack.workspace.score, null, 2)),
    },
    {
      name: "analytics/content-calendar.json",
      bytes: encode(JSON.stringify(pack.workspace.calendar, null, 2)),
    },
  ];
}

function publishingZipFiles(pack: ReelExportPackage): ZipFile[] {
  if (!pack.publishing) {
    return [
      {
        name: "publishing/publishing-studio.json",
        bytes: encode(JSON.stringify({ status: "not_available" }, null, 2)),
      },
    ];
  }

  return [
    { name: "publishing/publishing-studio.json", bytes: encode(JSON.stringify(pack.publishing, null, 2)) },
    { name: "publishing/connected-accounts.json", bytes: encode(JSON.stringify(pack.publishing.accounts, null, 2)) },
    { name: "publishing/publish-queue.json", bytes: encode(JSON.stringify(pack.publishing.jobs, null, 2)) },
    { name: "publishing/analytics-preview.json", bytes: encode(JSON.stringify(pack.publishing.analyticsPreview, null, 2)) },
    {
      name: "publishing/ai-optimization.md",
      bytes: encode(
        [
          "# AI Publishing Optimization",
          "",
          `Hook score: ${pack.publishing.suggestions.hookScore}`,
          `Thumbnail score: ${pack.publishing.suggestions.thumbnailScore}`,
          `CTA score: ${pack.publishing.suggestions.ctaScore}`,
          "",
          "## Suggestions",
          "",
          ...pack.publishing.suggestions.improvements.map((item) => `- ${item}`),
          "",
        ].join("\n"),
      ),
    },
  ];
}

function autoPilotZipFiles(pack: ReelExportPackage): ZipFile[] {
  if (!pack.autoPilot) {
    return [{ name: "auto-pilot/auto-pilot.json", bytes: encode(JSON.stringify({ status: "not_available" }, null, 2)) }];
  }

  return [
    { name: "auto-pilot/auto-pilot.json", bytes: encode(JSON.stringify(pack.autoPilot, null, 2)) },
    { name: "auto-pilot/tasks.json", bytes: encode(JSON.stringify(pack.autoPilot.tasks, null, 2)) },
    { name: "auto-pilot/optimization-v2.json", bytes: encode(JSON.stringify(pack.autoPilot.optimization, null, 2)) },
    {
      name: "auto-pilot/strategy.md",
      bytes: encode(
        [
          "# ReelMind AI Auto-Pilot Strategy",
          "",
          `Readiness score: ${pack.autoPilot.readinessScore}/100`,
          "",
          "## Best Posting Times",
          ...pack.autoPilot.bestPostingTimes.map((time) => `- ${time}`),
          "",
          "## AI Titles",
          ...pack.autoPilot.titles.map((title) => `- ${title}`),
          "",
          "## Hashtags",
          pack.autoPilot.hashtags.join(" "),
          "",
        ].join("\n"),
      ),
    },
  ];
}

function learningEngineZipFiles(pack: ReelExportPackage): ZipFile[] {
  if (!pack.learningEngine) {
    return [{ name: "learning-engine/learning-engine.json", bytes: encode(JSON.stringify({ status: "not_available" }, null, 2)) }];
  }

  return [
    { name: "learning-engine/learning-engine.json", bytes: encode(JSON.stringify(pack.learningEngine, null, 2)) },
    { name: "learning-engine/content-performance.json", bytes: encode(JSON.stringify(pack.learningEngine.performance, null, 2)) },
    { name: "learning-engine/learning-events.json", bytes: encode(JSON.stringify({ recommendations: pack.learningEngine.recommendations, viralPatterns: pack.learningEngine.viralPatterns }, null, 2)) },
    { name: "learning-engine/prediction-v3.json", bytes: encode(JSON.stringify(pack.learningEngine.predictionV3, null, 2)) },
    {
      name: "learning-engine/recommendations.md",
      bytes: encode(
        [
          "# Creator Learning Engine",
          "",
          "## Viral Patterns",
          ...pack.learningEngine.viralPatterns.map((item) => `- ${item}`),
          "",
          "## AI Recommendations",
          ...pack.learningEngine.recommendations.map((item) => `- ${item}`),
          "",
        ].join("\n"),
      ),
    },
  ];
}

function trendIntelligenceZipFiles(pack: ReelExportPackage): ZipFile[] {
  if (!pack.trendIntelligence) {
    return [{ name: "trend-intelligence/trend-intelligence.json", bytes: encode(JSON.stringify({ status: "not_available" }, null, 2)) }];
  }

  return [
    { name: "trend-intelligence/trend-intelligence.json", bytes: encode(JSON.stringify(pack.trendIntelligence, null, 2)) },
    { name: "trend-intelligence/trend-reports.json", bytes: encode(JSON.stringify(pack.trendIntelligence.trends, null, 2)) },
    { name: "trend-intelligence/competitor-reports.json", bytes: encode(JSON.stringify(pack.trendIntelligence.competitors, null, 2)) },
    { name: "trend-intelligence/viral-patterns.json", bytes: encode(JSON.stringify(pack.trendIntelligence.viralPatterns, null, 2)) },
    { name: "trend-intelligence/content-gaps.json", bytes: encode(JSON.stringify(pack.trendIntelligence.contentGaps, null, 2)) },
    {
      name: "trend-intelligence/recommended-ideas.md",
      bytes: encode(
        [
          "# Trend Intelligence Recommended Ideas",
          "",
          ...pack.trendIntelligence.ideas.flatMap((idea) => [
            `## ${idea.title}`,
            "",
            `Hook: ${idea.hook}`,
            `Audience: ${idea.audience}`,
            `Virality Score: ${idea.viralityScore}`,
            "",
          ]),
        ].join("\n"),
      ),
    },
  ];
}

function productionZipFiles(pack: ReelExportPackage): ZipFile[] {
  const productionPack = parseProductionPack(pack.outputs.productionPack);
  if (!productionPack) {
    return [
      {
        name: "production-pack/production-pack.json",
        bytes: encode(pack.outputs.productionPack.trim() || "{}"),
      },
    ];
  }

  return [
    { name: "production-pack/director-pack.md", bytes: encode(formatDirectorPack(productionPack)) },
    { name: "production-pack/character-consistency.md", bytes: encode(formatCharacterConsistency(productionPack)) },
    { name: "production-pack/veo-prompts.txt", bytes: encode(providerPromptFile(productionPack, "veoPrompt")) },
    { name: "production-pack/kling-prompts.txt", bytes: encode(providerPromptFile(productionPack, "klingPrompt")) },
    { name: "production-pack/runway-prompts.txt", bytes: encode(providerPromptFile(productionPack, "runwayPrompt")) },
    { name: "production-pack/pika-prompts.txt", bytes: encode(providerPromptFile(productionPack, "pikaPrompt")) },
    { name: "production-pack/luma-prompts.txt", bytes: encode(providerPromptFile(productionPack, "lumaPrompt")) },
    { name: "production-pack/negative-prompts.txt", bytes: encode(negativePromptFile(productionPack)) },
  ];
}

export async function downloadZipPackage(pack: ReelExportPackage) {
  const files: ZipFile[] = [
    ...exportSections.map((section) => ({
      name: outputFileName(section.key),
      bytes: encode(pack.outputs[section.key].trim()),
    })),
    ...productionZipFiles(pack),
    ...(await voiceoverZipFiles(pack)),
    ...(await videoZipFiles(pack)),
    ...workspaceZipFiles(pack),
    ...publishingZipFiles(pack),
    ...autoPilotZipFiles(pack),
    ...learningEngineZipFiles(pack),
    ...trendIntelligenceZipFiles(pack),
    ...(await loadProductionThumbnailFiles(pack)),
    { name: "package.json", bytes: encode(formatReelPackageJson(pack)) },
    { name: "package.md", bytes: encode(formatReelPackageMarkdown(pack)) },
    await loadThumbnailZipFile(pack),
  ];

  downloadBlob(new Blob([buildZip(files)], { type: "application/zip" }), packageFilename(pack, "zip"));
}
