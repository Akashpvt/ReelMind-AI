import { NextResponse } from "next/server";
import { loadEnvConfig } from "@next/env";
import { parseVoiceoverGuide } from "@/lib/reel-generation";
import { routeVoice } from "@/lib/tools";
import { serverEnv } from "@/lib/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ELEVENLABS_DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

type VoiceRequest = {
  projectId?: unknown;
  voiceover?: unknown;
  language?: unknown;
  voiceStyle?: unknown;
  emotion?: unknown;
  pacing?: unknown;
};

const debugVoice = process.env.DEBUG_VOICE === "true" || process.env.DEBUG_TOOLS === "true" || process.env.NODE_ENV === "development";

function logVoice(scope: string, payload: unknown) {
  if (debugVoice) {
    console.info(`[voice] ${scope}`, payload);
  }
}

function getVoiceEnv() {
  const env = serverEnv();
  const hasElevenLabsKey = Boolean(process.env.ELEVENLABS_API_KEY);
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

  return {
    env: {
      ...env,
      ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
      ELEVENLABS_VOICE_ID: process.env.ELEVENLABS_VOICE_ID || (hasElevenLabsKey ? ELEVENLABS_DEFAULT_VOICE_ID : undefined),
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
    hasElevenLabsKey,
    hasOpenAIKey,
  };
}

function cleanNarration(voiceover: string) {
  const guide = parseVoiceoverGuide(voiceover);
  if (!guide?.scriptBeats.length) {
    return voiceover
      .replace(/[{}[\]"]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 4500);
  }

  return guide.scriptBeats
    .map((beat) => {
      const pause = beat.pauseAfter ? ` [pause ${beat.pauseAfter}]` : "";
      const emotion = beat.emotion ? `(${beat.emotion}) ` : "";
      return `${emotion}${beat.line}${pause}`;
    })
    .join("\n")
    .slice(0, 4500);
}

function pacingToSpeed(pacing: string) {
  if (/fast/i.test(pacing)) return 1.12;
  if (/slow/i.test(pacing)) return 0.9;
  return 1;
}

function estimateDurationMs(text: string, pacing: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const wordsPerMinute = /slow/i.test(pacing) ? 125 : /fast/i.test(pacing) ? 170 : 145;
  return Math.max(3000, Math.round((words / wordsPerMinute) * 60000));
}

function messageFromStatus(status?: string, provider?: string) {
  if (status === "missing_credentials") return "Voice provider not configured";
  if (status === "failed") return `${provider ?? "Voice provider"} generation failed.`;
  return "Voice generation failed.";
}

export async function POST(request: Request) {
  let body: VoiceRequest;
  try {
    body = (await request.json()) as VoiceRequest;
  } catch {
    return NextResponse.json({ success: false, status: "failed", message: "Invalid JSON request body." }, { status: 400 });
  }

  if (typeof body.voiceover !== "string" || !body.voiceover.trim()) {
    return NextResponse.json({ success: false, status: "failed", message: "Voiceover script is required." }, { status: 400 });
  }

  const startedAt = Date.now();
  const voiceStyle = typeof body.voiceStyle === "string" ? body.voiceStyle : "Cinematic narrator";
  const emotion = typeof body.emotion === "string" ? body.emotion : "Balanced";
  const pacing = typeof body.pacing === "string" ? body.pacing : "Medium";
  const language = typeof body.language === "string" ? body.language : "English";
  const narration = cleanNarration(body.voiceover);
  const { env, hasElevenLabsKey, hasOpenAIKey } = getVoiceEnv();

  logVoice("credential_status", {
    hasElevenLabsKey,
    hasOpenAIKey,
  });

  if (!hasElevenLabsKey && !hasOpenAIKey) {
    return NextResponse.json({
      success: false,
      provider: null,
      status: "not_configured",
      message: "Voice provider not configured",
      generationMs: Date.now() - startedAt,
    });
  }

  const primaryProvider = hasElevenLabsKey ? "elevenlabs" : "openai-voice";
  const fallbackProvider = hasElevenLabsKey && hasOpenAIKey ? "openai-voice" : undefined;
  logVoice("provider_selected", {
    primaryProvider,
    fallbackProvider,
    elevenlabsConnected: hasElevenLabsKey,
    openaiVoiceConnected: hasOpenAIKey,
  });

  const result = await routeVoice(
    {
      text: narration,
      language,
      emotion,
      speed: pacingToSpeed(pacing),
      style: voiceStyle,
    },
    {
      primary: primaryProvider,
      fallback: fallbackProvider,
      taskType: "voice_asset_generation",
      agentType: "voice",
      env,
      strictProviders: true,
    },
  );

  logVoice("provider_result", {
    provider: result.provider,
    status: result.output.status,
    error: result.output.error,
    attemptedProviders: result.output.attemptedProviders,
    latency: result.latency,
  });

  if (typeof result.output.audioUrl !== "string") {
    const status = result.output.status === "missing_credentials" ? "not_configured" : "failed";
    const message = result.output.error || messageFromStatus(result.output.status, result.provider);
    return NextResponse.json({
      success: false,
      provider: result.provider,
      status,
      message,
      generationMs: Date.now() - startedAt,
    });
  }

  return NextResponse.json({
    success: true,
    provider: result.provider,
    audioUrl: result.output.audioUrl,
    downloadUrl: result.output.downloadUrl ?? result.output.audioUrl,
    durationMs: typeof result.output.durationMs === "number" ? result.output.durationMs : estimateDurationMs(narration, pacing),
    generationMs: Date.now() - startedAt,
    status: "completed",
    voiceName: result.provider === "openai-voice" ? "OpenAI Voice" : "ElevenLabs",
    language,
    voiceStyle,
    emotion,
    pacing,
  });
}
