import { BaseAgent } from "@/lib/agents/base-agent";
import {
  generateCompetitorAnalysis,
  generateContentGapAnalysis,
  generateIdeaGeneration,
  generateTrendAnalysis,
} from "@/lib/agents/research-agent-tools";
import {
  generateCaption,
  generateCTA,
  generateHashtags,
  generateHook,
  generateShortScript,
  type ScriptAgentInput,
  type ScriptDuration,
} from "@/lib/agents/script-agent-tools";
import {
  generateImagePrompts,
  generateScenes,
  generateVideoPrompts,
  generateVisualPlan,
  type StoryboardAgentInput,
  type StoryboardDuration,
  type StoryboardScene,
  type StoryboardScriptOutput,
} from "@/lib/agents/storyboard-agent-tools";
import {
  generateCTRPrediction,
  generateThumbnailConcepts,
  generateThumbnailPrompt,
  generateThumbnailText,
  type ThumbnailAgentInput,
  type ThumbnailFormat,
} from "@/lib/agents/thumbnail-agent-tools";
import {
  generateEmotionProfile,
  generatePauseMap,
  generateVoiceDirection,
  generateVoiceScript,
  type VoiceAgentInput,
  type VoiceDuration,
} from "@/lib/agents/voice-agent-tools";
import {
  generateAssetManifest,
  generateRenderPrompt,
  generateSceneTimeline,
  generateShotList,
  generateVideoPlan,
  type VideoAgentInput,
  type VideoDuration,
} from "@/lib/agents/video-agent-tools";
import {
  generateFacebookPackage,
  generateInstagramPackage,
  generateScheduleRecommendation,
  generateSEOMetadata,
  generateTikTokPackage,
  generateYoutubePackage,
  publishFacebook,
  publishInstagram,
  publishTikTok,
  publishYoutube,
  type PublishingAgentInput,
} from "@/lib/agents/publishing-agent-tools";
import type { AgentTask, AgentType } from "@/lib/agents/types";
import { getSmartRecommendations, retrieveMemory } from "@/lib/memory";
import { routeToolCall } from "@/lib/tools";

function sourceInput(task: AgentTask) {
  const input = task.input as { niche?: unknown; title?: unknown; prompt?: unknown; originalInput?: { niche?: unknown; title?: unknown; prompt?: unknown } };
  return input.originalInput ?? input;
}

function memoryContext(task: AgentTask, fallbackNiche = "AI") {
  const source = sourceInput(task);
  const niche = typeof source?.niche === "string" ? source.niche : typeof source?.title === "string" ? source.title : fallbackNiche;
  const query = typeof source?.prompt === "string" ? source.prompt : typeof source?.title === "string" ? source.title : "";
  return {
    memories: retrieveMemory({ niche, query, limit: 5 }),
    recommendations: getSmartRecommendations(niche, query),
  };
}

function recordValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function scriptDuration(value: unknown): ScriptDuration {
  return value === "15s" || value === "60s" ? value : "30s";
}

function researchOutputFromTask(task: AgentTask) {
  const input = recordValue(task.input);
  const dependencyOutputs = recordValue(input.dependencyOutputs);
  const workflowOutput = recordValue(input.workflowOutput);
  return recordValue(input.previousOutput ?? dependencyOutputs.research ?? workflowOutput.research);
}

function previousOutputFromTask(task: AgentTask) {
  const input = recordValue(task.input);
  return recordValue(input.previousOutput);
}

function scriptInputFromTask(task: AgentTask): ScriptAgentInput {
  const source = sourceInput(task);
  const research = researchOutputFromTask(task);
  const ideas = arrayValue<ScriptAgentInput["selectedIdea"]>(research.ideas);
  const niche = typeof source?.niche === "string" ? source.niche : "AI";

  return {
    niche,
    trendData: arrayValue(research.trends),
    competitorData: arrayValue(research.competitors),
    contentGaps: arrayValue(research.contentGaps),
    selectedIdea: ideas[0] ?? null,
    duration: scriptDuration(recordValue(source).duration),
  };
}

function storyboardDuration(value: unknown): StoryboardDuration {
  return value === "15s" || value === "60s" ? value : "30s";
}

function scriptOutputFromTask(task: AgentTask): StoryboardScriptOutput {
  const previous = previousOutputFromTask(task);
  const input = recordValue(task.input);
  const dependencyOutputs = recordValue(input.dependencyOutputs);
  const workflowOutput = recordValue(input.workflowOutput);
  return recordValue(previous.script || previous.hook ? previous : dependencyOutputs.script ?? workflowOutput.script) as StoryboardScriptOutput;
}

function storyboardInputFromTask(task: AgentTask): StoryboardAgentInput {
  const source = sourceInput(task);
  return {
    niche: typeof source?.niche === "string" ? source.niche : "AI",
    scriptOutput: scriptOutputFromTask(task),
    duration: storyboardDuration(recordValue(source).duration),
  };
}

function thumbnailFormat(value: unknown): ThumbnailFormat {
  return value === "1:1" || value === "16:9" || value === "9:16" ? value : "9:16";
}

function storyboardOutputFromTask(task: AgentTask) {
  const previous = previousOutputFromTask(task);
  const input = recordValue(task.input);
  const dependencyOutputs = recordValue(input.dependencyOutputs);
  const workflowOutput = recordValue(input.workflowOutput);
  return recordValue(Array.isArray(previous.scenes) ? previous : dependencyOutputs.storyboard ?? workflowOutput.storyboard);
}

function thumbnailInputFromTask(task: AgentTask): ThumbnailAgentInput {
  const source = sourceInput(task);
  const storyboard = storyboardOutputFromTask(task);
  const script = scriptOutputFromTask(task);
  return {
    niche: typeof source?.niche === "string" ? source.niche : "AI",
    scenes: arrayValue<StoryboardScene>(storyboard.scenes),
    hook: typeof script.hook === "string" ? script.hook : arrayValue<StoryboardScene>(storyboard.scenes)[0]?.onScreenText ?? "",
    format: thumbnailFormat(recordValue(source).format ?? recordValue(source).aspectRatio),
  };
}

function voiceDuration(value: unknown): VoiceDuration {
  return value === "15s" || value === "60s" ? value : "30s";
}

function voiceInputFromTask(task: AgentTask): VoiceAgentInput {
  const source = sourceInput(task);
  const storyboard = storyboardOutputFromTask(task);
  return {
    niche: typeof source?.niche === "string" ? source.niche : "AI",
    scriptOutput: scriptOutputFromTask(task),
    scenes: arrayValue<StoryboardScene>(storyboard.scenes),
    duration: voiceDuration(recordValue(source).duration),
  };
}

function dependencyOutputFromTask(task: AgentTask, key: string) {
  const input = recordValue(task.input);
  const workflowOutput = recordValue(input.workflowOutput);
  return recordValue(workflowOutput[key]);
}

function videoDuration(value: unknown): VideoDuration {
  return value === "15s" || value === "60s" ? value : "30s";
}

function videoInputFromTask(task: AgentTask): VideoAgentInput {
  const source = sourceInput(task);
  const storyboard = dependencyOutputFromTask(task, "storyboard");
  const voice = previousOutputFromTask(task);
  const thumbnail = dependencyOutputFromTask(task, "thumbnail");
  return {
    niche: typeof source?.niche === "string" ? source.niche : "AI",
    scenes: arrayValue<StoryboardScene>(storyboard.scenes),
    voiceOutput: voice,
    thumbnailOutput: thumbnail,
    duration: videoDuration(recordValue(source).duration),
  };
}

function publishingInputFromTask(task: AgentTask): PublishingAgentInput {
  const source = sourceInput(task);
  return {
    niche: typeof source?.niche === "string" ? source.niche : "AI",
    researchOutput: dependencyOutputFromTask(task, "research"),
    scriptOutput: dependencyOutputFromTask(task, "script"),
    thumbnailOutput: dependencyOutputFromTask(task, "thumbnail"),
    videoOutput: previousOutputFromTask(task),
  };
}

abstract class MockAgent extends BaseAgent {
  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const toolCall = routeToolCall({
      agentType: this.type,
      taskType: `${this.type}_mock_execution`,
      payload: task.input,
    });
    return {
      agent: this.type,
      summary: `${this.name} completed mock execution.`,
      toolCall,
      receivedInput: task.input,
      nextAction: `Use ${this.type} output in the creator pipeline.`,
    };
  }
}

export class ResearchAgent extends MockAgent {
  readonly type: AgentType = "research";
  readonly name = "Research Agent";
  readonly description = "Generates trend intelligence, competitor signals, viral patterns, content gaps, and reel ideas.";

  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const source = sourceInput(task);
    const niche = typeof source?.niche === "string" ? source.niche : typeof source?.title === "string" ? source.title : "AI";
    const prompt = typeof source?.prompt === "string" ? source.prompt : "";
    const [trendAnalysis, competitorAnalysis, contentGapAnalysis, ideaGeneration] = await Promise.all([
      generateTrendAnalysis({ niche, prompt }),
      generateCompetitorAnalysis({ niche, prompt }),
      generateContentGapAnalysis({ niche, prompt }),
      generateIdeaGeneration({ niche, prompt }),
    ]);
    const metadata = {
      provider: trendAnalysis.metadata.provider,
      latency: trendAnalysis.metadata.latency + competitorAnalysis.metadata.latency + contentGapAnalysis.metadata.latency + ideaGeneration.metadata.latency,
      credits: trendAnalysis.metadata.credits + competitorAnalysis.metadata.credits + contentGapAnalysis.metadata.credits + ideaGeneration.metadata.credits,
      timestamp: new Date().toISOString(),
      executions: {
        trends: trendAnalysis.metadata,
        competitors: competitorAnalysis.metadata,
        contentGaps: contentGapAnalysis.metadata,
        ideas: ideaGeneration.metadata,
      },
    };

    return {
      agent: this.type,
      summary: "Research intelligence generated through Tool Router.",
      memoryContext: memoryContext(task, niche),
      trends: trendAnalysis.trends,
      competitors: competitorAnalysis.competitors,
      contentGaps: contentGapAnalysis.contentGaps,
      ideas: ideaGeneration.ideas,
      executionMetadata: metadata,
      providerOutputs: {
        trends: trendAnalysis.providerOutput,
        competitors: competitorAnalysis.providerOutput,
        contentGaps: contentGapAnalysis.providerOutput,
        ideas: ideaGeneration.providerOutput,
      },
    };
  }
}

export class ScriptAgent extends MockAgent {
  readonly type: AgentType = "script";
  readonly name = "Script Agent";
  readonly description = "Creates short-form hooks, scripts, captions, and CTAs.";

  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const input = scriptInputFromTask(task);
    const [hookResult, scriptResult, ctaResult, captionResult, hashtagsResult] = await Promise.all([
      generateHook(input),
      generateShortScript(input),
      generateCTA(input),
      generateCaption(input),
      generateHashtags(input),
    ]);
    const metadata = {
      provider: hookResult.metadata.provider,
      latency: hookResult.metadata.latency + scriptResult.metadata.latency + ctaResult.metadata.latency + captionResult.metadata.latency + hashtagsResult.metadata.latency,
      credits: hookResult.metadata.credits + scriptResult.metadata.credits + ctaResult.metadata.credits + captionResult.metadata.credits + hashtagsResult.metadata.credits,
      timestamp: new Date().toISOString(),
      executions: {
        hook: hookResult.metadata,
        script: scriptResult.metadata,
        cta: ctaResult.metadata,
        caption: captionResult.metadata,
        hashtags: hashtagsResult.metadata,
      },
    };

    return {
      agent: this.type,
      summary: "Script package generated through Tool Router.",
      hook: hookResult.hook,
      script: scriptResult.script,
      cta: ctaResult.cta,
      caption: captionResult.caption,
      hashtags: hashtagsResult.hashtags,
      metadata,
      providerOutputs: {
        hook: hookResult.providerOutput,
        script: scriptResult.providerOutput,
        cta: ctaResult.providerOutput,
        caption: captionResult.providerOutput,
        hashtags: hashtagsResult.providerOutput,
      },
      receivedInput: input,
      memoryContext: memoryContext(task),
      memoryApplied: "Script direction adapted from top hooks, winning titles, and historical creator patterns.",
    };
  }
}

export class StoryboardAgent extends MockAgent {
  readonly type: AgentType = "storyboard";
  readonly name = "Storyboard Agent";
  readonly description = "Turns scripts into scene-by-scene visual plans.";

  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const input = storyboardInputFromTask(task);
    const sceneResult = await generateScenes(input);
    const visualResult = await generateVisualPlan(input, sceneResult.scenes);
    const imageResult = await generateImagePrompts(input, visualResult.scenes);
    const videoResult = await generateVideoPrompts(input, imageResult.scenes);
    const metadata = {
      provider: sceneResult.metadata.provider,
      latency: sceneResult.metadata.latency + visualResult.metadata.latency + imageResult.metadata.latency + videoResult.metadata.latency,
      credits: sceneResult.metadata.credits + visualResult.metadata.credits + imageResult.metadata.credits + videoResult.metadata.credits,
      timestamp: new Date().toISOString(),
      executions: {
        scenes: sceneResult.metadata,
        visualPlan: visualResult.metadata,
        imagePrompts: imageResult.metadata,
        videoPrompts: videoResult.metadata,
      },
    };

    return {
      agent: this.type,
      summary: "Storyboard generated through Tool Router.",
      scenes: videoResult.scenes,
      metadata,
      providerOutputs: {
        scenes: sceneResult.providerOutput,
        visualPlan: visualResult.providerOutput,
        imagePrompts: imageResult.providerOutput,
        videoPrompts: videoResult.providerOutput,
      },
      receivedInput: input,
    };
  }
}

export class ThumbnailAgent extends MockAgent {
  readonly type: AgentType = "thumbnail";
  readonly name = "Thumbnail Agent";
  readonly description = "Plans and renders creator-ready thumbnail assets.";

  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const input = thumbnailInputFromTask(task);
    const conceptResult = await generateThumbnailConcepts(input);
    const [promptResult, textResult, ctrResult] = await Promise.all([
      generateThumbnailPrompt(input, conceptResult.concepts),
      generateThumbnailText(input),
      generateCTRPrediction(input, conceptResult.concepts),
    ]);
    const metadata = {
      provider: conceptResult.metadata.provider,
      latency: conceptResult.metadata.latency + promptResult.metadata.latency + textResult.metadata.latency + ctrResult.metadata.latency,
      credits: conceptResult.metadata.credits + promptResult.metadata.credits + textResult.metadata.credits + ctrResult.metadata.credits,
      timestamp: new Date().toISOString(),
      executions: {
        concepts: conceptResult.metadata,
        prompt: promptResult.metadata,
        thumbnailText: textResult.metadata,
        ctrPrediction: ctrResult.metadata,
      },
    };

    return {
      agent: this.type,
      summary: "Thumbnail package generated through Tool Router.",
      concepts: conceptResult.concepts,
      prompt: promptResult.prompt,
      thumbnailText: textResult.thumbnailText,
      ctrScore: ctrResult.ctrScore,
      imageUrl: promptResult.imageUrl ?? conceptResult.imageUrl ?? textResult.imageUrl ?? null,
      downloadUrl: promptResult.downloadUrl ?? conceptResult.downloadUrl ?? textResult.downloadUrl ?? null,
      provider: promptResult.provider,
      latency: metadata.latency,
      credits: metadata.credits,
      metadata,
      providerOutputs: {
        concepts: conceptResult.providerOutput,
        prompt: promptResult.providerOutput,
        thumbnailText: textResult.providerOutput,
        ctrPrediction: ctrResult.providerOutput,
      },
      receivedInput: input,
      memoryContext: memoryContext(task),
      memoryApplied: "Thumbnail direction reads winning thumbnail patterns before planning the asset.",
    };
  }
}

export class VoiceAgent extends MockAgent {
  readonly type: AgentType = "voice";
  readonly name = "Voice Agent";
  readonly description = "Produces voiceover direction and audio assets.";

  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const input = voiceInputFromTask(task);
    const scriptResult = await generateVoiceScript(input);
    const [directionResult, emotionResult, pauseResult] = await Promise.all([
      generateVoiceDirection(input, scriptResult.voiceScript),
      generateEmotionProfile(input, scriptResult.voiceScript),
      generatePauseMap(input, scriptResult.voiceScript),
    ]);
    const metadata = {
      provider: scriptResult.metadata.provider,
      latency: scriptResult.metadata.latency + directionResult.metadata.latency + emotionResult.metadata.latency + pauseResult.metadata.latency,
      credits: scriptResult.metadata.credits + directionResult.metadata.credits + emotionResult.metadata.credits + pauseResult.metadata.credits,
      timestamp: new Date().toISOString(),
      executions: {
        voiceScript: scriptResult.metadata,
        voiceDirection: directionResult.metadata,
        emotionProfile: emotionResult.metadata,
        pauseMap: pauseResult.metadata,
      },
    };

    return {
      agent: this.type,
      summary: "Voice package generated through Tool Router.",
      voiceScript: scriptResult.voiceScript,
      voiceDirection: directionResult.voiceDirection,
      emotionProfile: emotionResult.emotionProfile,
      pauseMap: pauseResult.pauseMap,
      audioUrl: scriptResult.audioUrl ?? directionResult.audioUrl ?? emotionResult.audioUrl ?? pauseResult.audioUrl ?? null,
      downloadUrl: scriptResult.downloadUrl ?? directionResult.downloadUrl ?? emotionResult.downloadUrl ?? pauseResult.downloadUrl ?? null,
      duration: scriptResult.duration || directionResult.duration || emotionResult.duration || pauseResult.duration || 0,
      provider: scriptResult.provider,
      latency: metadata.latency,
      credits: metadata.credits,
      metadata,
      providerOutputs: {
        voiceScript: scriptResult.providerOutput,
        voiceDirection: directionResult.providerOutput,
        emotionProfile: emotionResult.providerOutput,
        pauseMap: pauseResult.providerOutput,
      },
      receivedInput: input,
    };
  }
}

export class VideoAgent extends MockAgent {
  readonly type: AgentType = "video";
  readonly name = "Video Agent";
  readonly description = "Creates AI-video-ready production outputs.";

  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const input = videoInputFromTask(task);
    const planResult = await generateVideoPlan(input);
    const [timelineResult, shotListResult, renderPromptResult, manifestResult] = await Promise.all([
      generateSceneTimeline(input),
      generateShotList(input),
      generateRenderPrompt(input),
      generateAssetManifest(input),
    ]);
    const metadata = {
      provider: planResult.metadata.provider,
      latency: planResult.metadata.latency + timelineResult.metadata.latency + shotListResult.metadata.latency + renderPromptResult.metadata.latency + manifestResult.metadata.latency,
      credits: planResult.metadata.credits + timelineResult.metadata.credits + shotListResult.metadata.credits + renderPromptResult.metadata.credits + manifestResult.metadata.credits,
      timestamp: new Date().toISOString(),
      executions: {
        videoPlan: planResult.metadata,
        timeline: timelineResult.metadata,
        shotList: shotListResult.metadata,
        renderPrompt: renderPromptResult.metadata,
        assetManifest: manifestResult.metadata,
      },
    };

    return {
      agent: this.type,
      summary: "Video production blueprint generated through Tool Router.",
      videoPlan: planResult.videoPlan,
      timeline: timelineResult.timeline,
      shotList: shotListResult.shotList,
      renderPrompt: renderPromptResult.renderPrompt,
      assetManifest: manifestResult.assetManifest,
      videoUrl: planResult.videoUrl ?? timelineResult.videoUrl ?? shotListResult.videoUrl ?? renderPromptResult.videoUrl ?? manifestResult.videoUrl ?? null,
      downloadUrl: planResult.downloadUrl ?? timelineResult.downloadUrl ?? shotListResult.downloadUrl ?? renderPromptResult.downloadUrl ?? manifestResult.downloadUrl ?? null,
      thumbnailUrl: planResult.thumbnailUrl ?? timelineResult.thumbnailUrl ?? shotListResult.thumbnailUrl ?? renderPromptResult.thumbnailUrl ?? manifestResult.thumbnailUrl ?? null,
      duration: planResult.duration || timelineResult.duration || shotListResult.duration || renderPromptResult.duration || manifestResult.duration || 0,
      provider: planResult.provider,
      latency: metadata.latency,
      credits: metadata.credits,
      metadata,
      providerOutputs: {
        videoPlan: planResult.providerOutput,
        timeline: timelineResult.providerOutput,
        shotList: shotListResult.providerOutput,
        renderPrompt: renderPromptResult.providerOutput,
        assetManifest: manifestResult.providerOutput,
      },
      receivedInput: input,
    };
  }
}

export class PublishingAgent extends MockAgent {
  readonly type: AgentType = "publishing";
  readonly name = "Publishing Agent";
  readonly description = "Queues publishing jobs and platform-specific packages.";

  protected async run(task: AgentTask): Promise<unknown> {
    await new Promise((resolve) => setTimeout(resolve, 120));
    const input = publishingInputFromTask(task);
    const [youtubeResult, instagramResult, tiktokResult, facebookResult, seoResult, scheduleResult] = await Promise.all([
      generateYoutubePackage(input),
      generateInstagramPackage(input),
      generateTikTokPackage(input),
      generateFacebookPackage(input),
      generateSEOMetadata(input),
      generateScheduleRecommendation(input),
    ]);
    const [youtubePublish, instagramPublish, tiktokPublish, facebookPublish] = await Promise.all([
      publishYoutube(input, youtubeResult.youtube, { mode: "draft" }),
      publishInstagram(input, instagramResult.instagram, { mode: "draft" }),
      publishTikTok(input, tiktokResult.tiktok, { mode: "draft" }),
      publishFacebook(input, facebookResult.facebook, { mode: "draft" }),
    ]);
    const metadata = {
      provider: youtubeResult.metadata.provider,
      latency: youtubeResult.metadata.latency + instagramResult.metadata.latency + tiktokResult.metadata.latency + facebookResult.metadata.latency + seoResult.metadata.latency + scheduleResult.metadata.latency + youtubePublish.metadata.latency + instagramPublish.metadata.latency + tiktokPublish.metadata.latency + facebookPublish.metadata.latency,
      credits: youtubeResult.metadata.credits + instagramResult.metadata.credits + tiktokResult.metadata.credits + facebookResult.metadata.credits + seoResult.metadata.credits + scheduleResult.metadata.credits + youtubePublish.metadata.credits + instagramPublish.metadata.credits + tiktokPublish.metadata.credits + facebookPublish.metadata.credits,
      timestamp: new Date().toISOString(),
      executions: {
        youtube: youtubeResult.metadata,
        instagram: instagramResult.metadata,
        tiktok: tiktokResult.metadata,
        facebook: facebookResult.metadata,
        seo: seoResult.metadata,
        schedule: scheduleResult.metadata,
        publishYoutube: youtubePublish.metadata,
        publishInstagram: instagramPublish.metadata,
        publishTikTok: tiktokPublish.metadata,
        publishFacebook: facebookPublish.metadata,
      },
    };

    return {
      agent: this.type,
      summary: "Publishing package generated through Tool Router.",
      youtube: {
        ...youtubeResult.youtube,
        titleVariants: youtubeResult.titleVariants,
      },
      instagram: instagramResult.instagram,
      tiktok: tiktokResult.tiktok,
      facebook: facebookResult.facebook,
      seo: seoResult.seo,
      schedule: scheduleResult.schedule,
      publishing: {
        youtube: youtubePublish,
        instagram: instagramPublish,
        tiktok: tiktokPublish,
        facebook: facebookPublish,
      },
      metadata,
      providerOutputs: {
        youtube: youtubeResult.providerOutput,
        instagram: instagramResult.providerOutput,
        tiktok: tiktokResult.providerOutput,
        facebook: facebookResult.providerOutput,
        seo: seoResult.providerOutput,
        schedule: scheduleResult.providerOutput,
        publishYoutube: youtubePublish.providerOutput,
        publishInstagram: instagramPublish.providerOutput,
        publishTikTok: tiktokPublish.providerOutput,
        publishFacebook: facebookPublish.providerOutput,
      },
      receivedInput: input,
    };
  }
}

export class AnalyticsAgent extends MockAgent {
  readonly type: AgentType = "analytics";
  readonly name = "Analytics Agent";
  readonly description = "Reads performance signals and predicts outcomes.";

  protected async run(task: AgentTask): Promise<unknown> {
    const base = await super.run(task);
    return {
      ...(base as Record<string, unknown>),
      memoryContext: memoryContext(task),
      memoryApplied: "Analytics compares current workflow output against stored performance snapshots.",
    };
  }
}

export class LearningAgent extends MockAgent {
  readonly type: AgentType = "learning";
  readonly name = "Learning Agent";
  readonly description = "Turns analytics into reusable creator intelligence.";

  protected async run(task: AgentTask): Promise<unknown> {
    const base = await super.run(task);
    return {
      ...(base as Record<string, unknown>),
      memoryContext: memoryContext(task),
      memoryApplied: "Learning agent promotes high-scoring signals into future creator memories.",
    };
  }
}
