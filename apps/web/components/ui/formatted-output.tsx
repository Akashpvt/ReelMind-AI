import { useState, type ReactNode } from "react";
import {
  parseProductionPack,
  parseStoryboardScenes,
  parseVoiceoverGuide,
  type OutputKey,
  type ProductionPack,
  type ProductionScene,
  type StoryboardScene,
  type VoiceoverBeat,
  type VoiceoverGuide,
} from "@/lib/reel-generation";

type FormattedOutputProps = {
  content: string;
  outputKey: OutputKey;
  showCursor: boolean;
};

type Block =
  | { type: "paragraph"; value: string }
  | { type: "heading"; value: string; level: number }
  | { type: "quote"; value: string }
  | { type: "list"; values: string[]; ordered: boolean }
  | { type: "code"; value: string };

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.trim().startsWith("```")) {
      index += 1;
      const codeLines: string[] = [];
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", value: codeLines.join("\n") });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, value: heading[2] });
      index += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const values: string[] = [];
      while (
        index < lines.length &&
        (ordered ? /^\s*\d+\.\s+/.test(lines[index]) : /^\s*[-*]\s+/.test(lines[index]))
      ) {
        values.push(lines[index].replace(ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered, values });
      continue;
    }

    if (line.trim().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("> ")) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push({ type: "quote", value: quoteLines.join(" ") });
      continue;
    }

    const paragraphLines: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s+/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !lines[index].trim().startsWith("> ") &&
      !lines[index].trim().startsWith("```")
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", value: paragraphLines.join("\n") });
  }

  return blocks;
}

function renderInline(value: string): ReactNode[] {
  const tokens = value.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*)/g);

  return tokens.filter(Boolean).map((token, index) => {
    if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
      return (
        <strong key={`${token}-${index}`} className="font-semibold text-frost">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith("`") && token.endsWith("`")) {
      return (
        <code key={`${token}-${index}`} className="rounded-md border border-cyberBlue/18 bg-cyberBlue/[0.08] px-1.5 py-0.5 font-mono text-[0.9em] text-glowCyan">
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith("*") && token.endsWith("*")) {
      return (
        <em key={`${token}-${index}`} className="text-frost/90">
          {token.slice(1, -1)}
        </em>
      );
    }
    return <span key={`${token}-${index}`}>{token}</span>;
  });
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="output-prose min-w-0 max-w-full">
      {parseBlocks(content).map((block, index) => {
        if (block.type === "heading") {
          return (
            <h4 key={`${block.type}-${index}`} className={block.level === 1 ? "output-title" : "output-subtitle"}>
              {renderInline(block.value)}
            </h4>
          );
        }

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={`${block.type}-${index}`} className={block.ordered ? "output-list output-list-ordered" : "output-list"}>
              {block.values.map((value, itemIndex) => (
                <li key={`${block.type}-item-${itemIndex}`}>{renderInline(value)}</li>
              ))}
            </List>
          );
        }

        if (block.type === "quote") {
          return (
            <blockquote key={`${block.type}-${index}`} className="output-quote">
              {renderInline(block.value)}
            </blockquote>
          );
        }

        if (block.type === "code") {
          return (
            <pre key={`${block.type}-${index}`} className="output-code">
              <code>{block.value}</code>
            </pre>
          );
        }

        return (
          <p key={`${block.type}-${index}`} className="whitespace-pre-line break-words">
            {renderInline(block.value)}
          </p>
        );
      })}
    </div>
  );
}

export function FormattedOutput({ content, outputKey, showCursor }: FormattedOutputProps) {
  const isPrompt = outputKey === "videoPrompt" || outputKey === "thumbnailPrompt";

  if (outputKey === "storyboard") {
    const scenes = parseStoryboardScenes(content);
    if (scenes.length > 0) {
      return (
        <div className="grid min-w-0 gap-3 sm:gap-4">
          {scenes.map((scene, index) => (
            <StoryboardSceneCard key={`storyboard-${scene.sceneNumber}-${index}`} scene={scene} />
          ))}
          {showCursor ? <OutputCursor /> : null}
        </div>
      );
    }
  }

  if (outputKey === "voiceover") {
    const voiceover = parseVoiceoverGuide(content);
    if (voiceover) {
      return (
        <VoiceoverGuideView guide={voiceover} showCursor={showCursor} />
      );
    }
  }

  if (outputKey === "productionPack") {
    const productionPack = parseProductionPack(content);
    if (productionPack) {
      return <ProductionPackView pack={productionPack} showCursor={showCursor} />;
    }
  }

  if (outputKey === "hook") {
    return (
      <div className="output-hook">
        <span className="output-hook-mark" aria-hidden="true">
          &ldquo;
        </span>
        <MarkdownContent content={content} />
        {showCursor ? <OutputCursor /> : null}
      </div>
    );
  }

  if (outputKey === "cta") {
    return (
      <div className="output-cta">
        <p className="output-cta-label">Suggested call to action</p>
        <MarkdownContent content={content} />
        {showCursor ? <OutputCursor /> : null}
      </div>
    );
  }

  if (isPrompt) {
    return (
      <div className="output-prompt-block">
        <div className="output-prompt-header">
          <span className="h-1.5 w-1.5 rounded-full bg-cyberBlue shadow-blue-glow" />
          Generation prompt
        </div>
        <div className="output-prompt-content">
          <MarkdownContent content={content} />
          {showCursor ? <OutputCursor /> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="output-copy">
      <MarkdownContent content={content} />
      {showCursor ? <OutputCursor /> : null}
    </div>
  );
}

function OutputCursor() {
  return <span className="streaming-cursor ml-1 inline-block h-5 w-px bg-cyberBlue align-middle" />;
}

function StoryboardSceneCard({ scene }: { scene: StoryboardScene }) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cyberBlue/25 hover:bg-cyberBlue/[0.045] sm:p-4">
      <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyberBlue">
              Scene {scene.sceneNumber}
            </span>
            <span className="rounded-full border border-violetGlow/20 bg-violetGlow/10 px-2.5 py-1 text-[10px] font-medium text-violetGlow">
              {scene.timestamp}
            </span>
          </div>
          <h4 className="mt-3 break-words text-base font-semibold leading-6 text-frost">{scene.title}</h4>
          <p className="mt-2 text-sm leading-6 text-mist">{scene.visualDescription}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-mist">
            {scene.shotType}
          </span>
          <span className="rounded-full border border-[#34D399]/20 bg-[#34D399]/10 px-2.5 py-1 text-[11px] text-[#6EE7B7]">
            {scene.cameraMovement}
          </span>
        </div>
      </summary>

      <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-2">
        <StoryboardDetail label="Scene type" value={scene.sceneType} />
        <StoryboardDetail label="Emotion" value={scene.emotion} />
        <StoryboardDetail label="Narration" value={scene.narration} />
        <StoryboardDetail label="On-screen text" value={scene.onScreenText} />
        <StoryboardDetail label="Transition" value={scene.transition} />
        <StoryboardDetail label="Sound cue" value={scene.soundCue} />
      </div>
    </details>
  );
}

function StoryboardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-ink/35 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyberBlue">{label}</p>
      <p className="mt-2 break-words text-sm leading-6 text-frost/90">{value || "Not specified"}</p>
    </div>
  );
}

function VoiceoverGuideView({ guide, showCursor }: { guide: VoiceoverGuide; showCursor: boolean }) {
  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <div className="rounded-2xl border border-cyberBlue/20 bg-cyberBlue/[0.055] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="flex min-w-0 flex-wrap gap-2">
          {[guide.style, guide.recommendedVoiceType, guide.narrationSpeed, guide.emotionalIntensity].map((item, index) => (
            <span key={`voiceover-meta-${index}`} className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-frost/90">
              {item}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-mist">{guide.deliveryStyle}</p>
        {guide.pacingGuidance ? (
          <p className="mt-3 rounded-xl border border-violetGlow/15 bg-violetGlow/[0.08] p-3 text-sm leading-6 text-frost/90">
            {guide.pacingGuidance}
          </p>
        ) : null}
      </div>

      <details open className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 sm:p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.22em] text-cyberBlue">
          Narration script
        </summary>
        <div className="mt-4 space-y-3">
          {guide.scriptBeats.map((beat, index) => (
            <VoiceoverBeatCard key={`${beat.timestamp}-${index}`} beat={beat} />
          ))}
        </div>
      </details>

      <details className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 sm:p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.22em] text-violetGlow">
          Pauses and emphasis
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <VoiceoverList title="Pause positions" items={guide.pausePositions} />
          <VoiceoverList title="Beat emphasis" items={guide.emphasisSuggestions} />
        </div>
      </details>
      {showCursor ? <OutputCursor /> : null}
    </div>
  );
}

function VoiceoverBeatCard({ beat }: { beat: VoiceoverBeat }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/[0.08] bg-ink/40 p-3.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-2.5 py-1 text-[10px] font-semibold text-cyberBlue">
          {beat.timestamp || "Beat"}
        </span>
        {beat.emotion ? (
          <span className="rounded-full border border-violetGlow/20 bg-violetGlow/10 px-2.5 py-1 text-[10px] text-violetGlow">
            {beat.emotion}
          </span>
        ) : null}
        {beat.pauseAfter ? (
          <span className="rounded-full border border-[#FBBF24]/20 bg-[#FBBF24]/10 px-2.5 py-1 text-[10px] text-[#FDE68A]">
            pause {beat.pauseAfter}
          </span>
        ) : null}
      </div>
      <p className="mt-3 break-words text-base font-medium leading-7 text-frost">{beat.line}</p>
      {beat.emphasis ? (
        <p className="mt-3 rounded-xl border border-cyberBlue/15 bg-cyberBlue/[0.06] p-3 text-xs leading-5 text-glowCyan">
          Emphasis: {beat.emphasis}
        </p>
      ) : null}
    </div>
  );
}

function VoiceoverList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.08] bg-ink/35 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyberBlue">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-frost/90">
        {items.length ? items.map((item, index) => <li key={`${title}-${index}`} className="break-words">{item}</li>) : <li>Not specified</li>}
      </ul>
    </div>
  );
}

const providerTabs = [
  { key: "veoPrompt", label: "Veo" },
  { key: "klingPrompt", label: "Kling" },
  { key: "runwayPrompt", label: "Runway" },
  { key: "pikaPrompt", label: "Pika" },
  { key: "lumaPrompt", label: "Luma" },
] as const;

function ProductionPackView({ pack, showCursor }: { pack: ProductionPack; showCursor: boolean }) {
  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <details open className="rounded-2xl border border-cyberBlue/20 bg-cyberBlue/[0.055] p-3.5 sm:p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.22em] text-cyberBlue">
          Director Pack
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ProductionDetail label="Master direction" value={pack.masterDirection} />
          <ProductionDetail label="Visual style" value={pack.visualStyle} />
          <ProductionDetail label="Color palette" value={pack.colorPalette} />
          <ProductionDetail label="Lighting style" value={pack.lightingStyle} />
          <ProductionDetail label="Camera language" value={pack.cameraLanguage} />
          <ProductionDetail label="Pacing notes" value={pack.pacingNotes} />
        </div>
      </details>

      <details className="rounded-2xl border border-violetGlow/20 bg-violetGlow/[0.055] p-3.5 sm:p-4">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.22em] text-violetGlow">
          Character Consistency
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <ProductionDetail label="Character profile" value={pack.characterProfile} />
          <ProductionDetail label="Wardrobe" value={pack.wardrobe} />
          <ProductionDetail label="Continuity rules" value={pack.continuityRules} />
          <ProductionDetail label="Environment logic" value={pack.scenes[0]?.environment ?? "Use scene-specific environments."} />
        </div>
      </details>

      <div className="grid min-w-0 gap-3 sm:gap-4">
        {pack.scenes.map((scene, index) => (
          <ProductionSceneCard key={`production-scene-${scene.sceneNumber}-${index}`} scene={scene} />
        ))}
      </div>
      {showCursor ? <OutputCursor /> : null}
    </div>
  );
}

function ProductionSceneCard({ scene }: { scene: ProductionScene }) {
  const [activeProvider, setActiveProvider] = useState<(typeof providerTabs)[number]["key"]>("veoPrompt");
  const activePrompt = scene[activeProvider];
  const metadataBadges = [
    { fieldName: "camera_motion", value: scene.cameraMotion },
    { fieldName: "lens", value: scene.lens },
    { fieldName: "lighting", value: scene.lighting },
  ].filter((badge) => isMeaningfulMetadata(badge.value));

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt);
    } catch {
      // Clipboard failures are non-critical; the full package copy/export remains available.
    }
  };

  return (
    <details className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-cyberBlue/25 hover:bg-cyberBlue/[0.045] sm:p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 lg:flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyberBlue">
                Scene {scene.sceneNumber}
              </span>
              <span className="rounded-full border border-violetGlow/20 bg-violetGlow/10 px-2.5 py-1 text-[10px] text-violetGlow">
                {scene.timestamp}
              </span>
            </div>
            <h4 className="mt-3 break-words text-base font-semibold leading-6 text-frost">{scene.sceneTitle}</h4>
            <p className="mt-2 text-sm leading-6 text-mist">{scene.environment}</p>
          </div>
          {metadataBadges.length ? (
            <div className="flex w-full min-w-0 max-w-full flex-wrap gap-2 lg:w-auto lg:max-w-[46%] lg:justify-end">
              {metadataBadges.map((badge, index) => (
              <span
                key={`${scene.sceneNumber}-${badge.fieldName}-${index}`}
                title={badge.value}
                className="max-w-full rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-left text-[11px] leading-5 text-mist [overflow-wrap:anywhere]"
              >
                {compactMetadataValue(badge.value)}
              </span>
              ))}
            </div>
          ) : null}
        </div>
      </summary>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="hide-scrollbar flex max-w-full gap-2 overflow-x-auto pb-2 pr-6" role="tablist" aria-label="Video provider prompts">
          {providerTabs.map((provider, index) => (
            <button
              key={`${scene.sceneNumber}-provider-${provider.key}-${index}`}
              type="button"
              onClick={() => setActiveProvider(provider.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                activeProvider === provider.key
                  ? "border-cyberBlue/45 bg-cyberBlue/15 text-cyberBlue shadow-[0_0_22px_rgba(56,189,248,0.12)]"
                  : "border-white/10 bg-white/[0.04] text-mist hover:text-frost"
              }`}
            >
              {provider.label}
            </button>
          ))}
        </div>

        <div className="mt-3 min-w-0 rounded-2xl border border-cyberBlue/15 bg-ink/55 p-3.5">
          <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyberBlue">
              {providerTabs.find((provider) => provider.key === activeProvider)?.label} prompt
            </p>
            <button
              type="button"
              onClick={() => void copyPrompt()}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-mist transition hover:border-cyberBlue/30 hover:text-cyberBlue"
            >
              Copy prompt
            </button>
          </div>
          <p className="min-w-0 whitespace-pre-line break-words text-sm leading-6 text-frost/90 [overflow-wrap:anywhere]">{activePrompt || "Prompt unavailable."}</p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ProductionDetail label="Character consistency" value={scene.characterConsistency} />
          <ProductionDetail label="Emotion" value={scene.emotion} />
          <ProductionDetail label="Transition" value={scene.transition} />
          <ProductionDetail label="Negative prompt" value={scene.negativePrompt} tone="danger" />
        </div>
      </div>
    </details>
  );
}

function isMeaningfulMetadata(value: string) {
  const normalized = value.trim();
  return Boolean(normalized) && !/^n\/?a\b/i.test(normalized);
}

function compactMetadataValue(value: string) {
  const normalized = value.trim();
  if (/^n\/?a\b/i.test(normalized)) {
    return "N/A";
  }
  return normalized;
}

function ProductionDetail({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "danger" }) {
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${
      tone === "danger"
        ? "border-[#FB7185]/20 bg-[#FB7185]/[0.07]"
        : "border-white/[0.08] bg-ink/35"
    }`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${tone === "danger" ? "text-[#FDA4AF]" : "text-cyberBlue"}`}>
        {label}
      </p>
      <p className="mt-2 break-words text-sm leading-6 text-frost/90">{value || "Not specified"}</p>
    </div>
  );
}
