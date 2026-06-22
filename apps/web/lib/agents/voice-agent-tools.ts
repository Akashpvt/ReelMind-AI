import { routeVoice, type ToolRouteOutput } from "@/lib/tools";
import type { StoryboardScene } from "@/lib/agents/storyboard-agent-tools";
import type { StoryboardScriptOutput } from "@/lib/agents/storyboard-agent-tools";

export type VoiceDuration = "15s" | "30s" | "60s";

export type VoiceAgentInput = {
  niche: string;
  scriptOutput: StoryboardScriptOutput;
  scenes: StoryboardScene[];
  duration: VoiceDuration;
};

export type VoiceDirection = {
  pace: string;
  energy: string;
  tone: string;
  emphasis: string;
};

export type EmotionProfile = {
  primaryEmotion: string;
  intensity: number;
  audienceEffect: string;
};

export type PauseMapItem = {
  line: string;
  pauseMs: number;
};

type VoiceExecutionMetadata = {
  provider: string;
  latency: number;
  credits: number;
  timestamp: string;
};

type VoiceRouteOutput = {
  model?: string;
  audioUrl?: string | null;
  downloadUrl?: string | null;
  voiceId?: string | null;
  durationMs?: number;
  transcript?: string;
  attemptedProviders?: string[];
  mocked?: boolean;
  status?: string;
  error?: string | null;
};

type VoiceAssetResult = {
  audioUrl: string | null;
  downloadUrl: string | null;
  duration: number;
  provider: string;
  latency: number;
  credits: number;
};

function metadata(result: ToolRouteOutput<VoiceRouteOutput>): VoiceExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

function voiceAsset(result: ToolRouteOutput<VoiceRouteOutput>): VoiceAssetResult {
  return {
    audioUrl: result.output.audioUrl ?? null,
    downloadUrl: result.output.downloadUrl ?? result.output.audioUrl ?? null,
    duration: result.output.durationMs ?? 0,
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
  };
}

function narrationLines(input: VoiceAgentInput) {
  const sceneLines = input.scenes.map((scene) => scene.voiceLine).filter(Boolean);
  const scriptLines = [input.scriptOutput.hook, input.scriptOutput.script, input.scriptOutput.cta]
    .filter(Boolean)
    .join("\n")
    .split(/\n+/)
    .map((line) => line.replace(/^\d+-\d+s:\s*/i, "").trim())
    .filter(Boolean);
  return sceneLines.length ? sceneLines : scriptLines.length ? scriptLines : [`Most ${input.niche} creators need a sharper story.`, "Show the workflow clearly, then ask them to save it."];
}

function targetPace(duration: VoiceDuration) {
  if (duration === "15s") return "fast, crisp, high clarity";
  if (duration === "60s") return "measured, cinematic, story-led";
  return "medium-fast, energetic, creator-native";
}

function energy(duration: VoiceDuration) {
  if (duration === "15s") return "high";
  if (duration === "60s") return "medium with emotional build";
  return "medium-high";
}

async function voiceRoute(taskType: string, input: VoiceAgentInput, text: string) {
  return routeVoice(
    {
      text,
      language: "en",
      emotion: input.duration === "15s" ? "energetic" : input.duration === "60s" ? "cinematic" : "confident",
      speed: input.duration === "15s" ? 1.1 : input.duration === "60s" ? 0.92 : 1,
      style: `${input.niche} creator voice, ${targetPace(input.duration)}`,
    },
    {
      primary: "elevenlabs",
      fallback: "openai-voice",
      taskType,
      agentType: "voice",
    },
  );
}

export async function generateVoiceScript(input: VoiceAgentInput) {
  const lines = narrationLines(input);
  const voiceScript = lines
    .map((line, index) => {
      const marker = index === 0 ? "[HOOK]" : index === lines.length - 1 ? "[CTA]" : "[BEAT]";
      return `${marker} ${line}`;
    })
    .join("\n");
  const result = await voiceRoute("voice_script_generation", input, voiceScript);
  return { voiceScript, ...voiceAsset(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateVoiceDirection(input: VoiceAgentInput, voiceScript: string) {
  const result = await voiceRoute("voice_direction_generation", input, voiceScript);
  const voiceDirection: VoiceDirection = {
    pace: targetPace(input.duration),
    energy: energy(input.duration),
    tone: input.duration === "60s" ? "cinematic narrator with creator warmth" : "viral creator with confident urgency",
    emphasis: `Emphasize the hook, ${input.niche} outcome, and final save/comment CTA.`,
  };
  return { voiceDirection, ...voiceAsset(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generateEmotionProfile(input: VoiceAgentInput, voiceScript: string) {
  const result = await voiceRoute("voice_emotion_profile_generation", input, voiceScript);
  const emotionProfile: EmotionProfile = {
    primaryEmotion: input.duration === "15s" ? "curiosity" : input.duration === "60s" ? "aspiration" : "momentum",
    intensity: input.duration === "15s" ? 86 : input.duration === "60s" ? 72 : 80,
    audienceEffect: `Make ${input.niche} creators feel they found a practical shortcut worth saving.`,
  };
  return { emotionProfile, ...voiceAsset(result), metadata: metadata(result), providerOutput: result.output };
}

export async function generatePauseMap(input: VoiceAgentInput, voiceScript: string) {
  const result = await voiceRoute("voice_pause_map_generation", input, voiceScript);
  const pauseMap: PauseMapItem[] = voiceScript
    .split(/\n+/)
    .map((line, index) => ({
      line,
      pauseMs: index === 0 ? 180 : line.includes("[CTA]") ? 320 : input.duration === "60s" ? 260 : 140,
    }));
  return { pauseMap, ...voiceAsset(result), metadata: metadata(result), providerOutput: result.output };
}
