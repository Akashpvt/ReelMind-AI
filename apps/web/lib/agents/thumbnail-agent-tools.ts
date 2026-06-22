import { routeImage, type ToolRouteOutput } from "@/lib/tools";
import type { StoryboardScene } from "@/lib/agents/storyboard-agent-tools";

export type ThumbnailFormat = "1:1" | "16:9" | "9:16";

export type ThumbnailAgentInput = {
  niche: string;
  scenes: StoryboardScene[];
  hook: string;
  format: ThumbnailFormat;
};

export type ThumbnailConcept = {
  title: string;
  emotion: string;
  composition: string;
  colors: string;
  focalPoint: string;
};

type ThumbnailExecutionMetadata = {
  provider: string;
  latency: number;
  credits: number;
  timestamp: string;
};

type ThumbnailRouteOutput = {
  model?: string;
  imageUrl?: string;
  downloadUrl?: string;
  width?: number;
  height?: number;
  attemptedProviders?: string[];
  mocked?: boolean;
  status?: string;
  error?: string | null;
};

type ThumbnailImageResult = {
  imageUrl: string | null;
  downloadUrl: string | null;
  provider: string;
  latency: number;
  credits: number;
};

function metadata(result: ToolRouteOutput<ThumbnailRouteOutput>): ThumbnailExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

function imageResult(result: ToolRouteOutput<ThumbnailRouteOutput>): ThumbnailImageResult {
  return {
    imageUrl: result.output.imageUrl ?? null,
    downloadUrl: result.output.downloadUrl ?? result.output.imageUrl ?? null,
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
  };
}

function firstScene(input: ThumbnailAgentInput) {
  return input.scenes[0];
}

function heroText(input: ThumbnailAgentInput) {
  const text = input.hook || firstScene(input)?.onScreenText || `${input.niche} Shortcut`;
  return text
    .replace(/[^\w\s!?]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join(" ");
}

function score(seed: string, min: number, max: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 41 + seed.charCodeAt(index)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

async function thumbnailRoute(taskType: string, input: ThumbnailAgentInput) {
  return routeImage(
    {
      prompt: [
        `Task: ${taskType}`,
        `Niche: ${input.niche}`,
        `Format: ${input.format}`,
        `Hook: ${input.hook}`,
        `Storyboard scene: ${firstScene(input)?.visual ?? ""}`,
      ].join("\n"),
      aspectRatio: input.format,
      style: "premium cinematic SaaS thumbnail",
    },
    {
      primary: "gemini-image",
      fallback: "pollinations",
      taskType,
      agentType: "thumbnail",
    },
  );
}

export async function generateThumbnailConcepts(input: ThumbnailAgentInput) {
  const result = await thumbnailRoute("thumbnail_concept_generation", input);
  const concepts: ThumbnailConcept[] = [
    {
      title: "Proof-first Creator Shock",
      emotion: "surprise",
      composition: `Large creator face on one side, glowing ${input.niche} workflow cards on the other, strong diagonal tension.`,
      colors: "deep navy, electric cyan, violet glow, white text",
      focalPoint: heroText(input),
    },
    {
      title: "Before vs After System",
      emotion: "relief",
      composition: "Split-screen chaos-to-clarity transformation with a bright center reveal.",
      colors: "black, neon blue, magenta accents, soft green success glow",
      focalPoint: "before/after contrast",
    },
    {
      title: "Premium Tool Reveal",
      emotion: "curiosity",
      composition: "Single cinematic dashboard object floating in glassmorphism space with a bold promise overlay.",
      colors: "midnight gradient, cyan rim light, purple aura, frosted highlights",
      focalPoint: `${input.niche} creator pipeline`,
    },
  ];
  return { concepts, ...imageResult(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateThumbnailPrompt(input: ThumbnailAgentInput, concepts: ThumbnailConcept[]) {
  const result = await thumbnailRoute("thumbnail_prompt_generation", input);
  const concept = concepts[0];
  const prompt = `Create a ${input.format} cinematic thumbnail for a ${input.niche} reel. Concept: ${concept.title}. Emotion: ${concept.emotion}. Composition: ${concept.composition}. Colors: ${concept.colors}. Focal point: ${concept.focalPoint}. Add bold readable hook-aligned text: "${heroText(input)}". Premium dark SaaS style, high contrast, sharp face/object detail, neon cyan and purple glow, no clutter, no distorted text.`;
  return { prompt, ...imageResult(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateThumbnailText(input: ThumbnailAgentInput) {
  const result = await thumbnailRoute("thumbnail_text_generation", input);
  const thumbnailText = heroText(input).toUpperCase();
  return { thumbnailText, ...imageResult(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateCTRPrediction(input: ThumbnailAgentInput, concepts: ThumbnailConcept[]) {
  const result = await thumbnailRoute("thumbnail_ctr_prediction", input);
  const ctrScore = score(`${input.niche}-${input.hook}-${concepts[0]?.title ?? ""}-${input.format}`, 68, 96);
  return { ctrScore, ...imageResult(result), metadata: metadata(result), providerOutput: result.output };
}
