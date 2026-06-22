import { routeText, type ToolRouteOutput } from "@/lib/tools";
import type { ResearchCompetitor, ResearchContentGap, ResearchIdea, ResearchTrend } from "@/lib/agents/research-agent-tools";

export type ScriptDuration = "15s" | "30s" | "60s";

export type ScriptAgentInput = {
  niche: string;
  trendData: ResearchTrend[];
  competitorData: ResearchCompetitor[];
  contentGaps: ResearchContentGap[];
  selectedIdea: ResearchIdea | null;
  duration: ScriptDuration;
};

type ScriptExecutionMetadata = {
  provider: string;
  latency: number;
  credits: number;
  timestamp: string;
};

type ScriptRouteOutput = {
  model?: string;
  text?: string;
  attemptedProviders?: string[];
  mocked?: boolean;
  status?: string;
  error?: string | null;
};

function metadata(result: ToolRouteOutput<ScriptRouteOutput>): ScriptExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

function selectedAngle(input: ScriptAgentInput) {
  return input.selectedIdea?.title.replace(/^\d+\.\s*/, "") ?? input.contentGaps[0]?.topic ?? `${input.niche} creator workflow`;
}

function topTrend(input: ScriptAgentInput) {
  return input.trendData[0]?.keyword ?? `${input.niche} growth`;
}

function competitorPattern(input: ScriptAgentInput) {
  return input.competitorData[0]?.hookStyle ?? "curiosity gap";
}

function durationBeats(duration: ScriptDuration) {
  if (duration === "15s") return ["0-3s hook", "3-10s proof", "10-15s CTA"];
  if (duration === "60s") return ["0-5s hook", "5-20s setup", "20-45s teaching sequence", "45-55s payoff", "55-60s CTA"];
  return ["0-4s hook", "4-14s problem", "14-24s workflow", "24-30s CTA"];
}

async function scriptRoute(taskType: string, input: ScriptAgentInput) {
  return routeText(
    {
      prompt: [
        `Task: ${taskType}`,
        `Niche: ${input.niche}`,
        `Duration: ${input.duration}`,
        `Selected idea: ${selectedAngle(input)}`,
        `Top trend: ${topTrend(input)}`,
        `Competitor pattern: ${competitorPattern(input)}`,
        `Content gaps: ${input.contentGaps.map((gap) => gap.topic).join("; ")}`,
      ].join("\n"),
      system: "You are ReelMind AI's Script Agent. Create concise short-form creator copy using research context.",
    },
    {
      primary: "gemini",
      fallback: "openai",
      taskType,
      agentType: "script",
    },
  );
}

export async function generateHook(input: ScriptAgentInput) {
  const result = await scriptRoute("script_hook_generation", input);
  const hook = input.selectedIdea?.hook ?? `Most ${input.niche} creators are missing the ${topTrend(input)} signal.`;
  return {
    hook,
    metadata: metadata(result),
    providerOutput: result.output,
  };
}

export async function generateShortScript(input: ScriptAgentInput) {
  const result = await scriptRoute("script_short_script_generation", input);
  const beats = durationBeats(input.duration);
  const script = beats
    .map((beat, index) => {
      const lines = [
        `${beat}: Open with ${index === 0 ? input.selectedIdea?.hook ?? `a sharp ${input.niche} creator pain point` : `proof around ${selectedAngle(input)}`}.`,
        `${beat}: Show the viewer why ${topTrend(input)} matters now.`,
        `${beat}: Make the next action feel simple and worth saving.`,
      ];
      return lines[index % lines.length];
    })
    .join("\n");
  return {
    script,
    metadata: metadata(result),
    providerOutput: result.output,
  };
}

export async function generateCTA(input: ScriptAgentInput) {
  const result = await scriptRoute("script_cta_generation", input);
  const cta = `Save this ${input.duration} ${input.niche} workflow and comment "REEL" if you want the full creator system.`;
  return {
    cta,
    metadata: metadata(result),
    providerOutput: result.output,
  };
}

export async function generateCaption(input: ScriptAgentInput) {
  const result = await scriptRoute("script_caption_generation", input);
  const caption = `${selectedAngle(input)}\n\nThe best-performing pattern right now: ${competitorPattern(input)} + one clear proof moment.\n\nUse this before your next reel.`;
  return {
    caption,
    metadata: metadata(result),
    providerOutput: result.output,
  };
}

export async function generateHashtags(input: ScriptAgentInput) {
  const result = await scriptRoute("script_hashtag_generation", input);
  const compactNiche = input.niche.replace(/\s+/g, "");
  const trendTag = topTrend(input).split(/\s+/)[0] ?? "Creator";
  const hashtags = [
    `#${compactNiche}`,
    "#CreatorOS",
    "#ReelMindAI",
    "#ViralReels",
    `#${trendTag}`,
    "#ContentStrategy",
    "#AICreator",
  ];
  return {
    hashtags,
    metadata: metadata(result),
    providerOutput: result.output,
  };
}
