import { routeVideo, type ToolRouteOutput } from "@/lib/tools";
import type { ThumbnailConcept } from "@/lib/agents/thumbnail-agent-tools";
import type { StoryboardScene } from "@/lib/agents/storyboard-agent-tools";
import type { EmotionProfile, PauseMapItem, VoiceDirection } from "@/lib/agents/voice-agent-tools";

export type VideoDuration = "15s" | "30s" | "60s";

export type VideoAgentInput = {
  niche: string;
  scenes: StoryboardScene[];
  voiceOutput: {
    voiceScript?: string;
    voiceDirection?: VoiceDirection;
    emotionProfile?: EmotionProfile;
    pauseMap?: PauseMapItem[];
  };
  thumbnailOutput: {
    concepts?: ThumbnailConcept[];
    prompt?: string;
    thumbnailText?: string;
    ctrScore?: number;
  };
  duration: VideoDuration;
};

export type SceneTimelineItem = {
  scene: number;
  startTime: string;
  endTime: string;
};

export type ShotListItem = {
  shotNumber: number;
  camera: string;
  movement: string;
  duration: string;
};

export type AssetManifest = {
  images: string[];
  videos: string[];
  voice: string[];
  captions: string[];
};

type VideoExecutionMetadata = {
  provider: string;
  latency: number;
  credits: number;
  timestamp: string;
};

type VideoRouteOutput = {
  model?: string;
  videoUrl?: string | null;
  downloadUrl?: string | null;
  thumbnailUrl?: string | null;
  durationSeconds?: number;
  providerJobId?: string;
  prompt?: string;
  attemptedProviders?: string[];
  mocked?: boolean;
  status?: string;
  error?: string | null;
};

type VideoAssetResult = {
  videoUrl: string | null;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
  duration: number;
  provider: string;
  latency: number;
  credits: number;
};

function metadata(result: ToolRouteOutput<VideoRouteOutput>): VideoExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

function videoAsset(result: ToolRouteOutput<VideoRouteOutput>): VideoAssetResult {
  return {
    videoUrl: result.output.videoUrl ?? null,
    downloadUrl: result.output.downloadUrl ?? result.output.videoUrl ?? null,
    thumbnailUrl: result.output.thumbnailUrl ?? null,
    duration: result.output.durationSeconds ?? 0,
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
  };
}

function seconds(value: string, fallback: number) {
  const match = value.match(/(\d+)-(\d+)s/);
  return match ? Number(match[2]) - Number(match[1]) : fallback;
}

function startEnd(scene: StoryboardScene, fallbackIndex: number, fallbackDuration: number) {
  const match = scene.duration.match(/(\d+)-(\d+)s/);
  if (match) return { startTime: `${match[1]}s`, endTime: `${match[2]}s` };
  const start = fallbackIndex * fallbackDuration;
  return { startTime: `${start}s`, endTime: `${start + fallbackDuration}s` };
}

function basePrompt(input: VideoAgentInput) {
  return [
    `Niche: ${input.niche}`,
    `Duration: ${input.duration}`,
    `Voice tone: ${input.voiceOutput.voiceDirection?.tone ?? "cinematic creator voice"}`,
    `Primary emotion: ${input.voiceOutput.emotionProfile?.primaryEmotion ?? "curiosity"}`,
    `Thumbnail promise: ${input.thumbnailOutput.thumbnailText ?? input.thumbnailOutput.concepts?.[0]?.title ?? "creator workflow"}`,
  ].join("\n");
}

async function videoRoute(taskType: string, input: VideoAgentInput, prompt: string) {
  return routeVideo(
    {
      prompt: `${basePrompt(input)}\nTask: ${taskType}\n${prompt}`,
      durationSeconds: input.duration === "15s" ? 15 : input.duration === "60s" ? 60 : 30,
      aspectRatio: "9:16",
      quality: input.duration === "15s" ? "fast" : "quality",
      style: "cinematic creator workflow",
    },
    {
      primary: "veo",
      fallback: "runway",
      taskType,
      agentType: "video",
    },
  );
}

export async function generateVideoPlan(input: VideoAgentInput) {
  const result = await videoRoute("video_plan_generation", input, "Build the final AI-video-ready creative blueprint.");
  const videoPlan = `Create a ${input.duration} ${input.niche} reel using ${input.scenes.length || 4} cinematic scenes, synchronized voiceover pacing, thumbnail-aligned opening promise, and clean AI-video continuity. Keep character, workspace, lighting, and typography consistent across all shots.`;
  return { videoPlan, ...videoAsset(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateSceneTimeline(input: VideoAgentInput) {
  const result = await videoRoute("video_scene_timeline_generation", input, "Convert storyboard scenes into exact timeline ranges.");
  const fallbackDuration = input.duration === "15s" ? 5 : input.duration === "60s" ? 10 : 7;
  const timeline: SceneTimelineItem[] = input.scenes.map((scene, index) => ({
    scene: scene.sceneNumber,
    ...startEnd(scene, index, fallbackDuration),
  }));
  return { timeline, ...videoAsset(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateShotList(input: VideoAgentInput) {
  const result = await videoRoute("video_shot_list_generation", input, "Generate production shot list with camera and motion.");
  const shotList: ShotListItem[] = input.scenes.map((scene, index) => ({
    shotNumber: index + 1,
    camera: scene.camera,
    movement: scene.motion,
    duration: scene.duration || `${seconds(scene.duration, 5)}s`,
  }));
  return { shotList, ...videoAsset(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateRenderPrompt(input: VideoAgentInput) {
  const result = await videoRoute("video_render_prompt_generation", input, "Generate Veo-compatible and Runway-compatible render instructions.");
  const veoPrompt = input.scenes
    .map((scene) => `Scene ${scene.sceneNumber}: ${scene.videoPrompt || scene.visual}. Camera ${scene.camera}, movement ${scene.motion}, voice line "${scene.voiceLine}".`)
    .join("\n");
  const runwayPrompt = `${veoPrompt}\nRunway fallback: preserve character consistency, avoid garbled text, maintain vertical 9:16 framing, cinematic dark SaaS glow.`;
  const renderPrompt = `Veo render prompt:\n${veoPrompt}\n\nRunway fallback prompt:\n${runwayPrompt}`;
  return { renderPrompt, ...videoAsset(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateAssetManifest(input: VideoAgentInput) {
  const result = await videoRoute("video_asset_manifest_generation", input, "Prepare asset manifest for render pipeline.");
  const assetManifest: AssetManifest = {
    images: [
      input.thumbnailOutput.prompt ?? "thumbnail prompt pending",
      ...input.scenes.map((scene) => scene.imagePrompt).filter(Boolean),
    ],
    videos: input.scenes.map((scene) => scene.videoPrompt || scene.visual).filter(Boolean),
    voice: [input.voiceOutput.voiceScript ?? "voice script pending"],
    captions: input.scenes.map((scene) => scene.onScreenText).filter(Boolean),
  };
  return { assetManifest, ...videoAsset(result), metadata: metadata(result), providerOutput: result.output };
}
