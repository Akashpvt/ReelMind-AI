import { routeText, type ToolRouteOutput } from "@/lib/tools";

export type StoryboardDuration = "15s" | "30s" | "60s";

export type StoryboardScriptOutput = {
  hook?: string;
  script?: string;
  cta?: string;
  caption?: string;
  hashtags?: string[];
};

export type StoryboardAgentInput = {
  niche: string;
  scriptOutput: StoryboardScriptOutput;
  duration: StoryboardDuration;
};

export type StoryboardScene = {
  sceneNumber: number;
  duration: string;
  visual: string;
  camera: string;
  motion: string;
  voiceLine: string;
  onScreenText: string;
  imagePrompt: string;
  videoPrompt: string;
};

type StoryboardExecutionMetadata = {
  provider: string;
  latency: number;
  credits: number;
  timestamp: string;
};

type StoryboardRouteOutput = {
  model?: string;
  text?: string;
  attemptedProviders?: string[];
  mocked?: boolean;
  status?: string;
  error?: string | null;
};

function metadata(result: ToolRouteOutput<StoryboardRouteOutput>): StoryboardExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

function totalSeconds(duration: StoryboardDuration) {
  return duration === "15s" ? 15 : duration === "60s" ? 60 : 30;
}

function sceneCount(duration: StoryboardDuration) {
  return duration === "15s" ? 3 : duration === "60s" ? 6 : 4;
}

function timeRange(index: number, count: number, duration: StoryboardDuration) {
  const total = totalSeconds(duration);
  const start = Math.round((index / count) * total);
  const end = Math.round(((index + 1) / count) * total);
  return `${start}-${end}s`;
}

function scriptLines(input: StoryboardAgentInput) {
  const raw = [
    input.scriptOutput.hook,
    input.scriptOutput.script,
    input.scriptOutput.cta,
  ]
    .filter(Boolean)
    .join("\n");
  const lines = raw
    .split(/\n+/)
    .map((line) => line.replace(/^\d+-\d+s:\s*/i, "").trim())
    .filter(Boolean);
  return lines.length ? lines : [`Most ${input.niche} creators need a clearer reel workflow.`, "Show the problem, reveal the process, and close with one action."];
}

function sceneBase(input: StoryboardAgentInput): StoryboardScene[] {
  const count = sceneCount(input.duration);
  const lines = scriptLines(input);
  const motions = ["slow push-in", "kinetic cut", "orbit reveal", "match cut", "handheld proof shot", "smooth pullback"];
  const cameras = ["close-up", "medium creator shot", "top-down workflow shot", "wide cinematic setup", "over-the-shoulder screen capture", "macro detail"];
  return Array.from({ length: count }, (_, index) => {
    const voiceLine = lines[index % lines.length];
    const sceneNumber = index + 1;
    const visual = index === 0
      ? `Creator faces a high-friction ${input.niche} problem in a dark cinematic workspace.`
      : index === count - 1
        ? `Final polished ${input.niche} reel package appears with a clear creator CTA.`
        : `Show the ${input.niche} workflow step with glowing UI cards, proof points, and creator action.`;
    const onScreenText = sceneNumber === 1 ? input.scriptOutput.hook ?? `${input.niche} shortcut` : voiceLine.slice(0, 54);

    return {
      sceneNumber,
      duration: timeRange(index, count, input.duration),
      visual,
      camera: cameras[index % cameras.length],
      motion: motions[index % motions.length],
      voiceLine,
      onScreenText,
      imagePrompt: "",
      videoPrompt: "",
    };
  });
}

async function storyboardRoute(taskType: string, input: StoryboardAgentInput) {
  return routeText(
    {
      prompt: [
        `Task: ${taskType}`,
        `Niche: ${input.niche}`,
        `Duration: ${input.duration}`,
        `Hook: ${input.scriptOutput.hook ?? ""}`,
        `Script: ${input.scriptOutput.script ?? ""}`,
        `CTA: ${input.scriptOutput.cta ?? ""}`,
      ].join("\n"),
      system: "You are ReelMind AI's Storyboard Agent. Convert short-form scripts into cinematic scene-by-scene production plans.",
    },
    {
      primary: "gemini",
      fallback: "claude",
      taskType,
      agentType: "storyboard",
    },
  );
}

export async function generateScenes(input: StoryboardAgentInput) {
  const result = await storyboardRoute("storyboard_scene_generation", input);
  return {
    scenes: sceneBase(input),
    metadata: metadata(result),
    providerOutput: result.output,
  };
}

export async function generateVisualPlan(input: StoryboardAgentInput, scenes: StoryboardScene[]) {
  const result = await storyboardRoute("storyboard_visual_plan_generation", input);
  return {
    scenes: scenes.map((scene) => ({
      ...scene,
      visual: `${scene.visual} Use premium dark gradients, cyan-purple glow, realistic creator tools, and readable ${input.duration} pacing.`,
    })),
    metadata: metadata(result),
    providerOutput: result.output,
  };
}

export async function generateImagePrompts(input: StoryboardAgentInput, scenes: StoryboardScene[]) {
  const result = await storyboardRoute("storyboard_image_prompt_generation", input);
  return {
    scenes: scenes.map((scene) => ({
      ...scene,
      imagePrompt: `Cinematic ${input.niche} reel storyboard frame, scene ${scene.sceneNumber}, ${scene.visual}, ${scene.camera}, ${scene.motion}, premium dark navy studio, neon cyan and purple rim light, glassmorphism creator dashboard, sharp readable text: "${scene.onScreenText}"`,
    })),
    metadata: metadata(result),
    providerOutput: result.output,
  };
}

export async function generateVideoPrompts(input: StoryboardAgentInput, scenes: StoryboardScene[]) {
  const result = await storyboardRoute("storyboard_video_prompt_generation", input);
  return {
    scenes: scenes.map((scene) => ({
      ...scene,
      videoPrompt: `AI video prompt for ${input.niche}, scene ${scene.sceneNumber} (${scene.duration}): ${scene.visual}. Camera: ${scene.camera}. Motion: ${scene.motion}. Voiceover line: "${scene.voiceLine}". On-screen text: "${scene.onScreenText}". Smooth short-form pacing, cinematic lighting, no distorted text, no extra fingers, consistent creator workspace.`,
    })),
    metadata: metadata(result),
    providerOutput: result.output,
  };
}
