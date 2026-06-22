import { routeText, type ToolRouteOutput } from "@/lib/tools";

type ResearchContext = {
  niche: string;
  prompt: string;
};

type ResearchExecutionMetadata = {
  provider: string;
  latency: number;
  credits: number;
  timestamp: string;
};

type ResearchRouteOutput = {
  model?: string;
  text?: string;
  answer?: string;
  attemptedProviders?: string[];
  mocked?: boolean;
  status?: string;
  error?: string | null;
};

export type ResearchTrend = {
  keyword: string;
  growth: number;
  competition: number;
  opportunity: number;
};

export type ResearchCompetitor = {
  creator: string;
  avgViews: number;
  hookStyle: string;
  thumbnailStyle: string;
  ctaStyle: string;
};

export type ResearchContentGap = {
  topic: string;
  demand: number;
  competition: number;
  opportunity: number;
  recommendation: string;
};

export type ResearchIdea = {
  title: string;
  hook: string;
  audience: string;
  viralityScore: number;
};

function score(seed: string, min: number, max: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 37 + seed.charCodeAt(index)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

function words(value: string) {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function metadata(result: ToolRouteOutput<ResearchRouteOutput>): ResearchExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

async function researchRoute(taskType: string, context: ResearchContext) {
  return routeText(
    {
      prompt: `${taskType} for ${context.niche}. Creator prompt: ${context.prompt || "Find high-opportunity creator content angles."}`,
      system: "You are ReelMind AI's research agent. Return concise creator intelligence.",
    },
    {
      primary: "perplexity",
      fallback: "google-search",
      taskType,
      agentType: "research",
    },
  );
}

export async function generateTrendAnalysis(context: ResearchContext) {
  const result = await researchRoute("research_trend_analysis", context);
  const tokens = words(`${context.niche} ${context.prompt}`);
  const trends: ResearchTrend[] = (tokens.length ? tokens : [context.niche, "creator", "workflow", "growth"]).map((token, index) => ({
    keyword: `${token} ${["automation", "shorts", "workflow", "monetization"][index % 4]}`,
    growth: score(`${token}-growth`, 54, 94),
    competition: score(`${token}-competition`, 28, 76),
    opportunity: score(`${token}-opportunity`, 58, 96),
  }));
  return { trends, metadata: metadata(result), providerOutput: result.output };
}

export async function generateCompetitorAnalysis(context: ResearchContext) {
  const result = await researchRoute("research_competitor_analysis", context);
  const bases = ["Studio Sprint", "Creator Signal", "Viral Frame", "Niche Lab"];
  const competitors: ResearchCompetitor[] = bases.map((creator, index) => ({
    creator: `${context.niche} ${creator}`,
    avgViews: score(`${creator}-${context.niche}-views`, 42000, 240000),
    hookStyle: ["curiosity gap", "audience callout", "contrarian proof", "transformation story"][index],
    thumbnailStyle: ["neon proof frame", "face plus result", "minimal premium object", "before-after split"][index],
    ctaStyle: ["save this workflow", "comment your niche", "follow for part two", "download the checklist"][index],
  }));
  return { competitors, metadata: metadata(result), providerOutput: result.output };
}

export async function generateContentGapAnalysis(context: ResearchContext) {
  const result = await researchRoute("research_content_gap_analysis", context);
  const topics = [
    `Beginner mistakes in ${context.niche}`,
    `${context.niche} workflow teardown`,
    `Low-budget ${context.niche} growth`,
    `${context.niche} tools creators ignore`,
  ];
  const contentGaps: ResearchContentGap[] = topics.map((topic) => ({
    topic,
    demand: score(`${topic}-demand`, 62, 95),
    competition: score(`${topic}-competition`, 20, 68),
    opportunity: score(`${topic}-opportunity`, 61, 97),
    recommendation: `Package this as a 30-second proof-first reel with one clear takeaway.`,
  }));
  return { contentGaps, metadata: metadata(result), providerOutput: result.output };
}

export async function generateIdeaGeneration(context: ResearchContext) {
  const result = await researchRoute("research_idea_generation", context);
  const ideas: ResearchIdea[] = Array.from({ length: 10 }, (_, index) => ({
    title: `${index + 1}. ${context.niche} idea creators can use today`,
    hook: `Most ${context.niche} creators miss this ${index + 1}-step advantage.`,
    audience: `${context.niche} creators, freelancers, and small teams`,
    viralityScore: score(`${context.niche}-idea-${index}`, 68, 97),
  }));
  return { ideas, metadata: metadata(result), providerOutput: result.output };
}
