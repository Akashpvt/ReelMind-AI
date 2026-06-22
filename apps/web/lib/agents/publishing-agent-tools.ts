import { routePublishing, routeText, type ToolRouteOutput } from "@/lib/tools";
import type { ResearchContentGap, ResearchIdea, ResearchTrend } from "@/lib/agents/research-agent-tools";

export type PublishingAgentInput = {
  niche: string;
  researchOutput: {
    trends?: ResearchTrend[];
    contentGaps?: ResearchContentGap[];
    ideas?: ResearchIdea[];
  };
  scriptOutput: {
    hook?: string;
    script?: string;
    cta?: string;
    caption?: string;
    hashtags?: string[];
  };
  thumbnailOutput: {
    thumbnailText?: string;
    ctrScore?: number;
    prompt?: string;
  };
  videoOutput: {
    videoPlan?: string;
    renderPrompt?: string;
  };
};

export type YoutubePackage = {
  title: string;
  description: string;
  hashtags: string[];
  keywords: string[];
  category: string;
};

export type InstagramPackage = {
  caption: string;
  hashtags: string[];
  keywords: string[];
};

export type TikTokPackage = {
  caption: string;
  hashtags: string[];
  keywords: string[];
};

export type FacebookPackage = {
  caption: string;
  hashtags: string[];
};

export type SEOMetadata = {
  primaryKeywords: string[];
  secondaryKeywords: string[];
  searchIntent: string;
  score: number;
};

export type ScheduleRecommendation = {
  recommendedDay: string;
  recommendedTime: string;
  timezone: string;
  confidence: number;
};

type PublishingExecutionMetadata = {
  provider: string;
  latency: number;
  credits: number;
  timestamp: string;
};

type PublishingResultPayload = {
  publishId: string;
  platform: "youtube" | "instagram" | "tiktok" | "facebook";
  status: "draft" | "scheduled" | "published" | "failed" | "package_only";
  scheduledTime: string | null;
  publishUrl: string | null;
  provider: string;
  latency: number;
  credits: number;
  metadata: PublishingExecutionMetadata;
  providerOutput: PublishingPublishRouteOutput;
};

type PublishingRouteOutput = {
  model?: string;
  text?: string;
  attemptedProviders?: string[];
  mocked?: boolean;
  status?: string;
  error?: string | null;
};

type PublishingPublishRouteOutput = {
  publishId?: string;
  platform?: string;
  status?: "draft" | "scheduled" | "published" | "failed" | "package_only";
  scheduledTime?: string | null;
  publishUrl?: string | null;
  accountName?: string | null;
  attemptedProviders?: string[];
  mocked?: boolean;
  error?: string | null;
};

function metadata(result: ToolRouteOutput<PublishingRouteOutput>): PublishingExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

function score(seed: string, min: number, max: number) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 43 + seed.charCodeAt(index)) >>> 0;
  }
  return min + (hash % (max - min + 1));
}

function keywords(input: PublishingAgentInput) {
  const trendKeywords = input.researchOutput.trends?.map((trend) => trend.keyword) ?? [];
  const gapKeywords = input.researchOutput.contentGaps?.map((gap) => gap.topic) ?? [];
  return [...trendKeywords, ...gapKeywords, `${input.niche} creator workflow`, "AI content pipeline"].slice(0, 8);
}

function hashtags(input: PublishingAgentInput, extras: string[] = []) {
  const base = input.scriptOutput.hashtags?.length ? input.scriptOutput.hashtags : [`#${input.niche.replace(/\s+/g, "")}`, "#CreatorOS", "#ReelMindAI"];
  return [...new Set([...base, ...extras])].slice(0, 12);
}

function titleBase(input: PublishingAgentInput) {
  const idea = input.researchOutput.ideas?.[0]?.title.replace(/^\d+\.\s*/, "");
  return idea || input.thumbnailOutput.thumbnailText || input.scriptOutput.hook || `${input.niche} creator workflow`;
}

async function publishingRoute(taskType: string, input: PublishingAgentInput) {
  return routeText(
    {
      prompt: [
        `Task: ${taskType}`,
        `Niche: ${input.niche}`,
        `Hook: ${input.scriptOutput.hook ?? ""}`,
        `Caption: ${input.scriptOutput.caption ?? ""}`,
        `Thumbnail text: ${input.thumbnailOutput.thumbnailText ?? ""}`,
        `Video plan: ${input.videoOutput.videoPlan ?? ""}`,
        `Research keywords: ${keywords(input).join(", ")}`,
      ].join("\n"),
      system: "You are ReelMind AI's Publishing Agent. Generate platform-specific publishing packages, SEO, titles, hashtags, and schedule recommendations.",
    },
    {
      primary: "openai",
      fallback: "gemini",
      taskType,
      agentType: "publishing",
    },
  );
}

async function publishingExecuteRoute(
  platform: "youtube" | "instagram" | "tiktok" | "facebook",
  input: PublishingAgentInput,
  payload: {
    title: string;
    description: string;
    hashtags: string[];
    thumbnailUrl?: string;
    videoUrl?: string;
    scheduleTime?: string;
    mode?: "draft" | "scheduled" | "publish_now";
    oauthToken?: string;
  },
) {
  return routePublishing(
    {
      ...payload,
      platform,
    },
    {
      primary: platform,
      fallback: platform,
      taskType: `publish_${platform}`,
      agentType: "publishing",
    },
  );
}

export async function generateYoutubePackage(input: PublishingAgentInput) {
  const result = await publishingRoute("publishing_youtube_package_generation", input);
  const title = `${titleBase(input)} | ${input.niche} Reel System`;
  const youtube: YoutubePackage = {
    title,
    description: `${input.scriptOutput.caption ?? title}\n\n${input.scriptOutput.cta ?? "Save this workflow and build your next creator pipeline."}`,
    hashtags: hashtags(input, ["#YouTubeShorts", "#Shorts"]),
    keywords: keywords(input),
    category: "Education",
  };
  return { youtube, titleVariants: [title, `${input.niche}: From Idea to Viral Reel`, `The ${input.niche} workflow creators should save`], metadata: metadata(result), providerOutput: result.output };
}

export async function generateInstagramPackage(input: PublishingAgentInput) {
  const result = await publishingRoute("publishing_instagram_package_generation", input);
  const instagram: InstagramPackage = {
    caption: `${input.scriptOutput.caption ?? titleBase(input)}\n\nSave this before your next reel.`,
    hashtags: hashtags(input, ["#InstagramReels", "#ReelsTips"]),
    keywords: keywords(input).slice(0, 6),
  };
  return { instagram, metadata: metadata(result), providerOutput: result.output };
}

export async function generateTikTokPackage(input: PublishingAgentInput) {
  const result = await publishingRoute("publishing_tiktok_package_generation", input);
  const tiktok: TikTokPackage = {
    caption: `${input.scriptOutput.hook ?? titleBase(input)} Watch till the end for the workflow.`,
    hashtags: hashtags(input, ["#TikTokTips", "#CreatorTok"]),
    keywords: keywords(input).slice(0, 6),
  };
  return { tiktok, metadata: metadata(result), providerOutput: result.output };
}

export async function generateFacebookPackage(input: PublishingAgentInput) {
  const result = await publishingRoute("publishing_facebook_package_generation", input);
  const facebook: FacebookPackage = {
    caption: `${titleBase(input)}\n\n${input.scriptOutput.cta ?? "Share this with a creator who needs it."}`,
    hashtags: hashtags(input, ["#FacebookReels", "#SmallBusinessContent"]).slice(0, 8),
  };
  return { facebook, metadata: metadata(result), providerOutput: result.output };
}

export async function generateSEOMetadata(input: PublishingAgentInput) {
  const result = await publishingRoute("publishing_seo_metadata_generation", input);
  const seo: SEOMetadata = {
    primaryKeywords: keywords(input).slice(0, 4),
    secondaryKeywords: keywords(input).slice(4, 8),
    searchIntent: "Creators searching for practical short-form content workflow and AI production systems.",
    score: score(`${input.niche}-${input.thumbnailOutput.ctrScore ?? 0}`, 72, 97),
  };
  return { seo, metadata: metadata(result), providerOutput: result.output };
}

export async function generateScheduleRecommendation(input: PublishingAgentInput) {
  const result = await publishingRoute("publishing_schedule_recommendation_generation", input);
  const days = ["Tuesday", "Wednesday", "Thursday", "Saturday"];
  const times = ["6:30 PM", "8:00 PM", "11:00 AM", "7:15 PM"];
  const index = score(input.niche, 0, days.length - 1);
  const schedule: ScheduleRecommendation = {
    recommendedDay: days[index],
    recommendedTime: times[index],
    timezone: "Asia/Calcutta",
    confidence: score(`${input.niche}-schedule`, 74, 94),
  };
  return { schedule, metadata: metadata(result), providerOutput: result.output };
}

function publishMetadata(result: ToolRouteOutput<PublishingPublishRouteOutput>): PublishingExecutionMetadata {
  return {
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    timestamp: new Date().toISOString(),
  };
}

function packageOnlyFallback(
  platform: "youtube" | "instagram" | "tiktok" | "facebook",
  scheduleTime?: string,
): PublishingPublishRouteOutput {
  return {
    publishId: `pkg-${platform}-${Date.now()}`,
    platform,
    status: "package_only",
    scheduledTime: scheduleTime ?? null,
    publishUrl: null,
  };
}

function finalPublishResult(
  platform: "youtube" | "instagram" | "tiktok" | "facebook",
  result: ToolRouteOutput<PublishingPublishRouteOutput>,
  scheduleTime?: string,
): PublishingResultPayload {
  const fallback = packageOnlyFallback(platform, scheduleTime);
  const output = result.output.error ? fallback : { ...fallback, ...result.output };
  return {
    publishId: output.publishId ?? fallback.publishId ?? `pkg-${platform}-${Date.now()}`,
    platform,
    status: output.status ?? "package_only",
    scheduledTime: output.scheduledTime ?? scheduleTime ?? null,
    publishUrl: output.publishUrl ?? null,
    provider: result.provider,
    latency: result.latency,
    credits: result.credits,
    metadata: publishMetadata(result),
    providerOutput: output,
  };
}

export async function publishYoutube(
  input: PublishingAgentInput,
  youtubePackage: YoutubePackage,
  options: { videoUrl?: string; thumbnailUrl?: string; scheduleTime?: string; mode?: "draft" | "scheduled" | "publish_now"; oauthToken?: string } = {},
) {
  const result = await publishingExecuteRoute("youtube", input, {
    title: youtubePackage.title,
    description: youtubePackage.description,
    hashtags: youtubePackage.hashtags,
    videoUrl: options.videoUrl,
    thumbnailUrl: options.thumbnailUrl,
    scheduleTime: options.scheduleTime,
    mode: options.mode,
    oauthToken: options.oauthToken,
  });
  return finalPublishResult("youtube", result, options.scheduleTime);
}

export async function publishInstagram(
  input: PublishingAgentInput,
  instagramPackage: InstagramPackage,
  options: { videoUrl?: string; thumbnailUrl?: string; scheduleTime?: string; mode?: "draft" | "scheduled" | "publish_now"; oauthToken?: string } = {},
) {
  const result = await publishingExecuteRoute("instagram", input, {
    title: titleBase(input),
    description: instagramPackage.caption,
    hashtags: instagramPackage.hashtags,
    videoUrl: options.videoUrl,
    thumbnailUrl: options.thumbnailUrl,
    scheduleTime: options.scheduleTime,
    mode: options.mode,
    oauthToken: options.oauthToken,
  });
  return finalPublishResult("instagram", result, options.scheduleTime);
}

export async function publishTikTok(
  input: PublishingAgentInput,
  tiktokPackage: TikTokPackage,
  options: { videoUrl?: string; thumbnailUrl?: string; scheduleTime?: string; mode?: "draft" | "scheduled" | "publish_now"; oauthToken?: string } = {},
) {
  const result = await publishingExecuteRoute("tiktok", input, {
    title: titleBase(input),
    description: tiktokPackage.caption,
    hashtags: tiktokPackage.hashtags,
    videoUrl: options.videoUrl,
    thumbnailUrl: options.thumbnailUrl,
    scheduleTime: options.scheduleTime,
    mode: options.mode,
    oauthToken: options.oauthToken,
  });
  return finalPublishResult("tiktok", result, options.scheduleTime);
}

export async function publishFacebook(
  input: PublishingAgentInput,
  facebookPackage: FacebookPackage,
  options: { videoUrl?: string; thumbnailUrl?: string; scheduleTime?: string; mode?: "draft" | "scheduled" | "publish_now"; oauthToken?: string } = {},
) {
  const result = await publishingExecuteRoute("facebook", input, {
    title: titleBase(input),
    description: facebookPackage.caption,
    hashtags: facebookPackage.hashtags,
    videoUrl: options.videoUrl,
    thumbnailUrl: options.thumbnailUrl,
    scheduleTime: options.scheduleTime,
    mode: options.mode,
    oauthToken: options.oauthToken,
  });
  return finalPublishResult("facebook", result, options.scheduleTime);
}
