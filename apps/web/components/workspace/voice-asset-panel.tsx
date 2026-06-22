"use client";

import { motion } from "framer-motion";

export type VoiceAsset = {
  id: string;
  project_id: string;
  user_id: string;
  provider: "elevenlabs" | "openai-voice" | "cartesia" | "playht" | "placeholder";
  voice_name: string | null;
  voice_style: string | null;
  language: string | null;
  emotion: string | null;
  pacing: string | null;
  audio_url: string | null;
  duration_ms: number | null;
  generation_ms: number | null;
  status: "completed" | "failed" | "not_configured" | "quota_limited" | "placeholder";
  error_message: string | null;
  created_at: string;
};

type VoiceAssetPanelProps = {
  asset: VoiceAsset | null;
  isGenerating: boolean;
  canGenerate: boolean;
  voiceStyle: string;
  language: string;
  emotion: string;
  pacing: string;
  onVoiceStyleChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onEmotionChange: (value: string) => void;
  onPacingChange: (value: string) => void;
  onGenerate: (variation?: boolean) => void;
  onNotify: (title: string, tone: "success" | "error", description?: string) => void;
};

const voiceStyles = [
  "Cinematic narrator",
  "Emotional storytelling",
  "Viral energetic",
  "Luxury brand",
  "Educational explainer",
  "Hindi/Hinglish creator mode",
];

const voiceLanguages = ["English", "Hinglish", "Hindi"];
const emotions = ["Balanced", "Warm", "Energetic", "Emotional", "Premium"];
const pacings = ["Slow", "Medium", "Fast"];

export function VoiceAssetPanel({
  asset,
  isGenerating,
  canGenerate,
  voiceStyle,
  language,
  emotion,
  pacing,
  onVoiceStyleChange,
  onLanguageChange,
  onEmotionChange,
  onPacingChange,
  onGenerate,
  onNotify,
}: VoiceAssetPanelProps) {
  const providerLabel = asset?.provider === "elevenlabs"
    ? "ElevenLabs"
    : asset?.provider === "openai-voice"
      ? "OpenAI Voice"
      : asset?.provider ?? "Placeholder";

  async function downloadAudio() {
    if (!asset?.audio_url) return;

    try {
      const response = await fetch(asset.audio_url);
      if (!response.ok) throw new Error("Audio download failed.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "reelmind-voiceover.mp3";
      link.click();
      URL.revokeObjectURL(url);
      onNotify("Voiceover downloaded", "success", "MP3 audio is ready.");
    } catch {
      onNotify("Download failed", "error", "The voice asset could not be downloaded.");
    }
  }

  return (
    <section className="mt-4 w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-3.5 sm:mt-5 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Voice Asset</p>
          <h3 className="mt-2 text-lg font-semibold text-frost">AI voice render engine</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Generate a creator-ready MP3 from your structured voiceover script. Provider keys stay server-side.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-[11px] font-medium ${
            asset?.status === "completed"
              ? "border-cyberBlue/25 bg-cyberBlue/10 text-cyberBlue"
              : asset?.status === "failed" || asset?.status === "quota_limited"
                ? "border-[#FB7185]/25 bg-[#FB7185]/10 text-[#FDA4AF]"
                : "border-[#FBBF24]/25 bg-[#FBBF24]/10 text-[#FDE68A]"
          }`}>
            {providerLabel}
          </span>
          {asset?.generation_ms ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-mist">
              {(asset.generation_ms / 1000).toFixed(1)}s
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <VoiceSelect label="Style" value={voiceStyle} options={voiceStyles} onChange={onVoiceStyleChange} />
        <VoiceSelect label="Language" value={language} options={voiceLanguages} onChange={onLanguageChange} />
        <VoiceSelect label="Emotion" value={emotion} options={emotions} onChange={onEmotionChange} />
        <VoiceSelect label="Pacing" value={pacing} options={pacings} onChange={onPacingChange} />
      </div>

      <div className="mt-4 flex min-w-0 flex-wrap gap-2">
        {[emotion, pacing, voiceStyle].map((chip, index) => (
          <span key={`voice-chip-${index}`} className="max-w-full rounded-full border border-violetGlow/20 bg-violetGlow/10 px-3 py-1.5 text-xs text-violetGlow [overflow-wrap:anywhere]">
            {chip}
          </span>
        ))}
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-cyberBlue/15 bg-ink/55 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyberBlue">
              {isGenerating ? "Generating audio" : asset?.audio_url ? "Audio preview" : "No voice generated yet"}
            </p>
            <Waveform isActive={isGenerating || Boolean(asset?.audio_url)} />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row lg:w-auto">
            <button
              type="button"
              onClick={() => onGenerate(false)}
              disabled={!canGenerate || isGenerating}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-4 text-xs font-medium text-cyberBlue transition hover:border-cyberBlue/45 hover:text-frost disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Generate voice"}
            </button>
            <button
              type="button"
              onClick={() => onGenerate(true)}
              disabled={!canGenerate || isGenerating}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-violetGlow/25 bg-violetGlow/10 px-4 text-xs font-medium text-violetGlow transition hover:border-violetGlow/45 hover:text-frost disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate variation
            </button>
          </div>
        </div>

        {asset?.audio_url ? (
          <div className="mt-4 grid gap-3">
            <audio controls src={asset.audio_url} className="w-full max-w-full" />
            <button
              type="button"
              onClick={() => void downloadAudio()}
              className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-frost transition hover:border-cyberBlue/30 hover:text-cyberBlue sm:w-auto"
            >
              Download MP3
            </button>
          </div>
        ) : asset?.error_message ? (
          <p className="mt-4 rounded-2xl border border-[#FBBF24]/20 bg-[#FBBF24]/10 p-3 text-sm leading-6 text-[#FDE68A]">
            {asset.error_message}
          </p>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-3 text-sm leading-6 text-mist">
            Voice preview appears here after generation. If ElevenLabs is not configured, you will see a clean setup message.
          </p>
        )}
      </div>
    </section>
  );
}

function VoiceSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="workspace-input mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm normal-case tracking-normal text-frost outline-none"
      >
        {options.map((option) => (
          <option key={`${label}-${option}`} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function Waveform({ isActive }: { isActive: boolean }) {
  return (
    <div className="mt-4 flex h-16 items-center gap-1.5">
      {Array.from({ length: 28 }, (_, index) => (
        <motion.span
          key={`voice-wave-${index}`}
          className="w-1 flex-1 rounded-full bg-gradient-to-t from-violetGlow to-cyberBlue"
          animate={isActive ? { height: [`${18 + (index % 4) * 7}%`, `${42 + (index % 6) * 6}%`, `${18 + (index % 4) * 7}%`] } : { height: "22%" }}
          transition={{ duration: 1.4, repeat: isActive ? Infinity : 0, ease: "easeInOut", delay: index * 0.035 }}
        />
      ))}
    </div>
  );
}
