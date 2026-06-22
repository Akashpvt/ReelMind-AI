"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ExportMenu } from "@/components/ui/export-menu";
import { FormattedOutput } from "@/components/ui/formatted-output";
import { SectionHeading } from "@/components/ui/section-heading";
import { ToastViewport, type ToastMessage, type ToastTone } from "@/components/ui/toast-viewport";
import {
  AutoPilotAgentPanel,
  getAutoPilotExportData,
} from "@/components/workspace/auto-pilot-agent-panel";
import { AgentControlCenterPanel } from "@/components/workspace/agent-control-center-panel";
import { AgentToolHubPanel } from "@/components/workspace/agent-tool-hub-panel";
import { AutonomousFactoryPanel } from "@/components/workspace/autonomous-factory-panel";
import { CreatorMemoryVaultPanel } from "@/components/workspace/creator-memory-vault-panel";
import {
  CreatorLearningEnginePanel,
  getLearningEngineExportData,
} from "@/components/workspace/creator-learning-engine-panel";
import {
  CreatorWorkspacePanel,
  getCreatorWorkspaceExportData,
} from "@/components/workspace/creator-workspace-panel";
import {
  getPublishingExportData,
  PublishingStudioPanel,
  type PublishingExportData,
} from "@/components/workspace/publishing-studio-panel";
import { ThumbnailPreviewCard } from "@/components/workspace/thumbnail-preview-card";
import {
  getTrendIntelligenceExportData,
  TrendIntelligencePanel,
} from "@/components/workspace/trend-intelligence-panel";
import { VideoStudioPanel, type VideoAsset } from "@/components/workspace/video-studio-panel";
import { VoiceAssetPanel, type VoiceAsset } from "@/components/workspace/voice-asset-panel";
import { fadeUp } from "@/lib/animations";
import {
  emptyGeneratedOutputs,
  isGeneratedOutputs,
  isStreamEvent,
  supportedDurations,
  supportedLanguages,
  supportedNiches,
  supportedTones,
  type GeneratedOutputs,
  type OutputKey,
} from "@/lib/reel-generation";
import {
  type VideoAspectRatio,
  type VideoDuration,
  type VideoProvider,
  type VideoQuality,
  type VideoResolution,
} from "@/lib/video-providers";
import {
  createProjectTitle,
  fallbackReelProjectColumns,
  fromProjectRow,
  isReelProjectRow,
  projectOrderColumns,
  reelProjectColumns,
  reelProjectColumnsWithoutProviderMetadata,
  toProjectInsert,
  type ActivityLogRow,
  type GenerationHistoryRow,
  type ImageProvider,
  type ReelProject as Project,
  type ReelProjectRow,
} from "@/lib/reel-projects";
import { createClient } from "@/lib/supabase/client";
type DashboardTab = OutputKey | "videoStudio" | "creatorWorkspace" | "publishingStudio" | "autoPilot" | "learningEngine" | "agentControl" | "trendIntelligence" | "autonomousFactory" | "memoryVault" | "toolHub";

const tabs: Array<{ key: DashboardTab; label: string }> = [
  { key: "hook", label: "Viral Hook" },
  { key: "script", label: "Reel Script" },
  { key: "caption", label: "Caption" },
  { key: "cta", label: "CTA" },
  { key: "videoPrompt", label: "Video Prompt" },
  { key: "thumbnailPrompt", label: "Thumbnail Prompt" },
  { key: "storyboard", label: "Storyboard" },
  { key: "voiceover", label: "Voiceover" },
  { key: "productionPack", label: "Production Pack" },
  { key: "videoStudio", label: "Video Studio" },
  { key: "creatorWorkspace", label: "Creator Workspace" },
  { key: "publishingStudio", label: "Publishing Studio" },
  { key: "autoPilot", label: "Auto-Pilot Agent" },
  { key: "learningEngine", label: "Learning Engine" },
  { key: "agentControl", label: "Agent Control Center" },
  { key: "trendIntelligence", label: "Trend Intelligence" },
  { key: "autonomousFactory", label: "Autonomous Factory" },
  { key: "memoryVault", label: "Memory Vault" },
  { key: "toolHub", label: "Agent Tool Hub" },
];
const outputTabs = tabs.filter((tab): tab is { key: OutputKey; label: string } => !["videoStudio", "creatorWorkspace", "publishingStudio", "autoPilot", "learningEngine", "agentControl", "trendIntelligence", "autonomousFactory", "memoryVault", "toolHub"].includes(tab.key));
const promptIdeas = [
  "Create a launch reel for a new skincare brand",
  "Explain three AI shortcuts for freelancers",
  "Turn a fitness transformation into a cinematic story",
];
const presetMarker = "--- Creative direction ---\n";
const presetEndMarker = "\n--- End creative direction ---";
const presets = [
  {
    name: "Viral",
    tone: "Motivational",
    direction: "Open with a pattern interrupt, build fast curiosity, and close on a comment-worthy payoff.",
  },
  {
    name: "Emotional",
    tone: "Emotional",
    direction: "Use a personal tension-to-relief arc with intimate details and a resonant final line.",
  },
  {
    name: "Cinematic",
    tone: "Cinematic",
    direction: "Frame the idea as a visual mini-film with moody pacing, striking shots, and dramatic reveals.",
  },
  {
    name: "Educational",
    tone: "Educational",
    direction: "Teach one practical transformation through clear steps, crisp examples, and an actionable takeaway.",
  },
  {
    name: "Luxury",
    tone: "Cinematic",
    direction: "Make the concept feel refined and aspirational with minimal language, premium detail, and quiet confidence.",
  },
  {
    name: "Storytelling",
    tone: "Emotional",
    direction: "Structure the reel as a beginning, turning point, and memorable resolution told in a natural creator voice.",
  },
  {
    name: "Dark Psychology",
    tone: "Educational",
    direction: "Explore attention and decision triggers with intriguing tension while keeping claims ethical and grounded.",
  },
  {
    name: "Motivation",
    tone: "Motivational",
    direction: "Build momentum through a relatable struggle, decisive mindset shift, and empowering call to action.",
  },
  {
    name: "AI Future",
    tone: "Cinematic",
    direction: "Position the idea inside an optimistic near-future world with intelligent tools and futuristic visual cues.",
  },
  {
    name: "Creator Growth",
    tone: "Educational",
    direction: "Give creators a repeatable growth insight with a strong retention hook and practical next step.",
  },
] as const;

type PresetName = (typeof presets)[number]["name"];

function getPresetNameFromPrompt(value: string): PresetName | null {
  const markerIndex = value.indexOf(presetMarker);
  if (markerIndex === -1) {
    return null;
  }

  const directionEnd = value.indexOf(presetEndMarker, markerIndex);
  const direction = value.slice(markerIndex + presetMarker.length, directionEnd === -1 ? undefined : directionEnd);
  return presets.find((preset) => direction.startsWith(`${preset.name}:`))?.name ?? null;
}

function removePresetDirection(value: string) {
  const markerIndex = value.indexOf(presetMarker);
  if (markerIndex === -1) {
    return value.trim();
  }

  const directionEnd = value.indexOf(presetEndMarker, markerIndex);
  if (directionEnd === -1) {
    return value.slice(0, markerIndex).trim();
  }

  return `${value.slice(0, markerIndex)}${value.slice(directionEnd + presetEndMarker.length)}`.trim();
}

function formatCreatedAt(createdAt: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

type DashboardPreviewProps = {
  userId?: string;
};

type SaveState = {
  projectId: string;
  status: "saving" | "saved" | "error";
} | null;

type ThumbnailMode = "fast" | "quality" | "free";
type ThumbnailGenerationState = "idle" | "queued" | "generating" | "provider-switching" | "completed" | "failed";

type ThumbnailAsset = {
  id: string;
  project_id: string;
  user_id: string;
  prompt: string;
  image_url: string | null;
  provider: ImageProvider | "failed";
  width: number;
  height: number;
  created_at: string;
  generation_ms: number | null;
  status: "queued" | "generating" | "completed" | "failed" | "placeholder";
  seed: number | null;
  prompt_hash: string | null;
  error_message: string | null;
};

type CreditTransactionRow = {
  credits_used: number;
};

type UsageAnalyticsRow = {
  tool_name: string;
  credits_consumed: number;
  created_at: string;
};

type UsageSummary = {
  credits: number;
  subscriptionTier: string;
  generationsToday: number;
  generationsThisMonth: number;
  generationsCount: number;
  creditsUsed: number;
  exportCount: number;
  imageGenerations: number;
  videoGenerations: number;
  videoCreditsUsed: number;
  mostUsedTool: string;
  thumbnailGenerationsToday: number;
  totalProjects: number;
};

const dailyThumbnailLimit = 5;
const projectHistoryLimit = 50;
const activityHistoryLimit = 8;
const thumbnailCooldownStorageKey = "reelmind-thumbnail-cooldown-until";
const creditCosts = {
  thumbnail: 1,
  storyboard: 1,
  voiceover: 1,
  productionPack: 2,
  videoGeneration: 5,
  publishingExport: 2,
} as const;

function packageCreditCost() {
  return creditCosts.storyboard + creditCosts.productionPack;
}

function planCreditLimit(subscriptionTier: string) {
  if (subscriptionTier === "agency") return 10000;
  if (subscriptionTier === "creator") return 2000;
  if (subscriptionTier === "pro") return 500;
  return 20;
}

function logDevelopmentError(scope: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[ReelMind] ${scope}`, error);
  }
}

type SupabaseErrorLike = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

function logSupabaseError(scope: string, error: unknown) {
  const safeError = (error ?? {}) as SupabaseErrorLike;
  const payload = {
    message: safeError.message ?? "Unknown Supabase error",
    code: safeError.code ?? null,
    details: safeError.details ?? null,
    hint: safeError.hint ?? null,
  };

  if (process.env.NODE_ENV === "development") {
    console.warn(`[ReelMind] ${scope}`, payload);
  }
}

function timeAgo(date: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hrs ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, base64] = dataUrl.split(",");
  const mimeType = meta.match(/data:(.*?);base64/)?.[1] ?? "audio/mpeg";
  const binary = window.atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new Blob([bytes], { type: mimeType });
}

export function DashboardPreview({ userId }: DashboardPreviewProps) {
  const [prompt, setPrompt] = useState("");
  const [niche, setNiche] = useState<string>(supportedNiches[0]);
  const [language, setLanguage] = useState<string>(supportedLanguages[0]);
  const [duration, setDuration] = useState<string>(supportedDurations[1]);
  const [tone, setTone] = useState<string>(supportedTones[0]);
  const [activePreset, setActivePreset] = useState<PresetName | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("hook");
  const [project, setProject] = useState<Project | null>(null);
  const [history, setHistory] = useState<Project[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(Boolean(userId));
  const [historyLoadError, setHistoryLoadError] = useState(false);
  const [deletingProjectIds, setDeletingProjectIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<SaveState>(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historySort, setHistorySort] = useState<"recent" | "oldest">("recent");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null);
  const [isThumbnailGenerating, setIsThumbnailGenerating] = useState(false);
  const [thumbnailGenerationState, setThumbnailGenerationState] = useState<ThumbnailGenerationState>("idle");
  const [thumbnailAssets, setThumbnailAssets] = useState<ThumbnailAsset[]>([]);
  const [thumbnailFailure, setThumbnailFailure] = useState<{
    projectId: string;
    message: string;
    quotaReached: boolean;
  } | null>(null);
  const [thumbnailCooldownSeconds, setThumbnailCooldownSeconds] = useState(0);
  const [thumbnailMode, setThumbnailMode] = useState<ThumbnailMode>("quality");
  const [generationTimeline, setGenerationTimeline] = useState<GenerationHistoryRow[]>([]);
  const [timelineLoadError, setTimelineLoadError] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([]);
  const [activityLoadError, setActivityLoadError] = useState(false);
  const [usage, setUsage] = useState<UsageSummary>({
    credits: 20,
    subscriptionTier: "free",
    generationsToday: 0,
    generationsThisMonth: 0,
    generationsCount: 0,
    creditsUsed: 0,
    exportCount: 0,
    imageGenerations: 0,
    videoGenerations: 0,
    videoCreditsUsed: 0,
    mostUsedTool: "None yet",
    thumbnailGenerationsToday: 0,
    totalProjects: 0,
  });
  const [usageStatus, setUsageStatus] = useState<"ready" | "unavailable">("ready");
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamedOutputs, setStreamedOutputs] = useState<GeneratedOutputs | null>(null);
  const [streamingTab, setStreamingTab] = useState<OutputKey | null>(null);
  const [completedTabs, setCompletedTabs] = useState<OutputKey[]>([]);
  const [generationStatusMessage, setGenerationStatusMessage] = useState<string | null>(null);
  const [editingTitleProjectId, setEditingTitleProjectId] = useState<string | null>(null);
  const [voiceAsset, setVoiceAsset] = useState<VoiceAsset | null>(null);
  const [isVoiceGenerating, setIsVoiceGenerating] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState("Cinematic narrator");
  const [voiceLanguage, setVoiceLanguage] = useState("English");
  const [voiceEmotion, setVoiceEmotion] = useState("Balanced");
  const [voicePacing, setVoicePacing] = useState("Medium");
  const [videoAsset, setVideoAsset] = useState<VideoAsset | null>(null);
  const [videoAssets, setVideoAssets] = useState<VideoAsset[]>([]);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoProvider, setVideoProvider] = useState<VideoProvider>("veo");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("1080p");
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>("9:16");
  const [videoDuration, setVideoDuration] = useState<VideoDuration>(10);
  const [videoQuality, setVideoQuality] = useState<VideoQuality>("quality");
  const [manualVideoThumbnailUrl, setManualVideoThumbnailUrl] = useState("");
  const [publishingExport, setPublishingExport] = useState<PublishingExportData | null>(null);
  const [promptIdeaIndex, setPromptIdeaIndex] = useState(0);
  const [typedPromptIdea, setTypedPromptIdea] = useState("");
  const [copiedTab, setCopiedTab] = useState<OutputKey | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const requestRef = useRef<AbortController | null>(null);
  const promptRef = useRef<HTMLTextAreaElement | null>(null);
  const titleSaveTimerRef = useRef<number | null>(null);
  const sessionSaveTimerRef = useRef<number | null>(null);
  const saveOperationRef = useRef(0);
  const persistedTitleRef = useRef<Map<string, string>>(new Map());
  const toastIdRef = useRef(0);
  const toastTimersRef = useRef<Map<number, number>>(new Map());
  const dismissToast = useCallback((id: number) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const showToast = useCallback(
    (title: string, toastTone: ToastTone, description?: string) => {
      const id = toastIdRef.current + 1;
      toastIdRef.current = id;
      setToasts((current) => [...current.slice(-2), { id, title, description, tone: toastTone }]);
      const timer = window.setTimeout(() => dismissToast(id), 3000);
      toastTimersRef.current.set(id, timer);
    },
    [dismissToast],
  );

  const hasCredits = useCallback(
    (requiredCredits: number, label: string) => {
      if (usageStatus === "ready" && usage.credits < requiredCredits) {
        showToast("Not enough credits", "error", `${label} needs ${requiredCredits} credit${requiredCredits === 1 ? "" : "s"}. Upgrade or wait for your credits to refresh.`);
        return false;
      }

      return true;
    },
    [showToast, usage.credits, usageStatus],
  );

  const consumeCredits = useCallback(
    async (action: string, creditsUsed: number) => {
      if (!userId) return false;

      const response = await fetch("/api/consume-credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { success?: unknown; error?: unknown };

      if (!response.ok || result.success !== true) {
        const message = typeof result.error === "string" ? result.error : "Credits could not be updated.";
        showToast(response.status === 402 ? "Not enough credits" : "Credit sync failed", "error", message);
        return false;
      }

      setUsage((current) => ({
        ...current,
        credits: Math.max(0, current.credits - creditsUsed),
        creditsUsed: current.creditsUsed + creditsUsed,
        generationsCount: current.generationsCount + 1,
        generationsThisMonth: current.generationsThisMonth + 1,
        imageGenerations: action === "thumbnail" ? current.imageGenerations + 1 : current.imageGenerations,
        videoGenerations: action === "video_generation" ? current.videoGenerations + 1 : current.videoGenerations,
        videoCreditsUsed: action === "video_generation" ? current.videoCreditsUsed + creditsUsed : current.videoCreditsUsed,
        mostUsedTool: current.mostUsedTool === "None yet" ? action : current.mostUsedTool,
      }));
      return true;
    },
    [showToast, userId],
  );

  useEffect(() => {
    const storedCooldown = window.localStorage.getItem(thumbnailCooldownStorageKey);
    if (!storedCooldown) {
      return;
    }

    const cooldownUntil = Number(storedCooldown);
    if (!Number.isFinite(cooldownUntil)) {
      window.localStorage.removeItem(thumbnailCooldownStorageKey);
      return;
    }

    const remainingSeconds = Math.ceil((cooldownUntil - Date.now()) / 1000);
    if (remainingSeconds > 0) {
      setThumbnailCooldownSeconds(remainingSeconds);
      return;
    }

    window.localStorage.removeItem(thumbnailCooldownStorageKey);
  }, []);

  useEffect(() => {
    if (thumbnailCooldownSeconds <= 0) {
      window.localStorage.removeItem(thumbnailCooldownStorageKey);
      return;
    }

    const timer = window.setTimeout(() => {
      setThumbnailCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [thumbnailCooldownSeconds]);
  const visibleHistory = useMemo(() => {
    const query = historyQuery.trim().toLowerCase();
    return history
      .filter((savedProject) => {
        if (!query) {
          return true;
        }
        return [savedProject.title, savedProject.prompt, savedProject.niche, savedProject.tone, savedProject.language]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((first, second) => {
        const order = Date.parse(second.updatedAt) - Date.parse(first.updatedAt);
        return historySort === "recent" ? order : -order;
      });
  }, [history, historyQuery, historySort]);

  const activeVoiceAsset = useMemo(
    () => (project && voiceAsset?.project_id === project.id ? voiceAsset : null),
    [project, voiceAsset],
  );

  const activeVideoAsset = useMemo(
    () => (project && videoAsset?.project_id === project.id ? videoAsset : null),
    [project, videoAsset],
  );

  const activeVideoAssets = useMemo(
    () => (project ? videoAssets.filter((asset) => asset.project_id === project.id) : []),
    [project, videoAssets],
  );

  const activeThumbnailAssets = useMemo(
    () => (project ? thumbnailAssets.filter((asset) => asset.project_id === project.id) : []),
    [project, thumbnailAssets],
  );

  const creatorWorkspaceExport = useMemo(
    () =>
      getCreatorWorkspaceExportData({
        project,
        history,
        voiceAsset: activeVoiceAsset,
        videoAssets: activeVideoAssets,
        thumbnailCount: activeThumbnailAssets.length,
        usage,
      }),
    [activeThumbnailAssets.length, activeVideoAssets, activeVoiceAsset, history, project, usage],
  );

  const publishingExportData = useMemo(
    () => publishingExport ?? getPublishingExportData(project),
    [project, publishingExport],
  );

  const autoPilotExportData = useMemo(
    () => getAutoPilotExportData(project, activeVoiceAsset, activeVideoAssets, activeThumbnailAssets.length),
    [activeThumbnailAssets.length, activeVideoAssets, activeVoiceAsset, project],
  );

  const learningEngineExportData = useMemo(
    () => getLearningEngineExportData(project, history, activeThumbnailAssets.length),
    [activeThumbnailAssets.length, history, project],
  );

  const trendIntelligenceExportData = useMemo(
    () => getTrendIntelligenceExportData(project?.niche ?? "AI"),
    [project?.niche],
  );

  const loadTimeline = useCallback(async (projectId: string) => {
    if (!userId || !projectId.trim() || projectId.startsWith("pending-")) {
      setGenerationTimeline([]);
      setTimelineLoadError(false);
      return;
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from("generation_history")
      .select("id,project_id,user_id,event_type,snapshot,thumbnail_url,created_at")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(activityHistoryLimit);

    if (error) {
      logDevelopmentError("Unable to load generation history.", error);
      setGenerationTimeline([]);
      setTimelineLoadError(true);
      return;
    }

    setGenerationTimeline((data as GenerationHistoryRow[] | null) ?? []);
    setTimelineLoadError(false);
  }, [userId]);

  const recordActivity = useCallback(
    async (projectId: string | null, action: ActivityLogRow["action"], detail: string) => {
      if (!userId) {
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("activity_logs")
        .insert({ user_id: userId, project_id: projectId, action, detail })
        .select("id,user_id,project_id,action,detail,created_at")
        .single();

      if (error) {
        logDevelopmentError("Unable to record activity.", error);
        setActivityLoadError(true);
        return;
      }

      if (data) {
        setActivityLoadError(false);
        setActivityLogs((current) => [data as ActivityLogRow, ...current].slice(0, 8));
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) {
      setHistory([]);
      setIsHistoryLoading(false);
      setHistoryLoadError(false);
      setActivityLoadError(false);
      return undefined;
    }

    let isMounted = true;
    setIsHistoryLoading(true);

    const fetchProjects = async () => {
      try {
        const supabase = createClient();
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const loadProjects = async () => {
          const result = await supabase
            .from("reel_projects")
            .select(reelProjectColumns, { count: "exact" })
            .eq("user_id", userId)
            .order(projectOrderColumns.updated, { ascending: false })
            .limit(projectHistoryLimit);

          if (!result.error) {
            return result;
          }

          logDevelopmentError("Project provider metadata unavailable; using compatible projection.", result.error);
          const compatibleResult = await supabase
            .from("reel_projects")
            .select(reelProjectColumnsWithoutProviderMetadata, { count: "exact" })
            .eq("user_id", userId)
            .order(projectOrderColumns.updated, { ascending: false })
            .limit(projectHistoryLimit);

          if (!compatibleResult.error) {
            return compatibleResult;
          }

          logDevelopmentError("Updated project fields unavailable; using created-at fallback.", compatibleResult.error);
          return supabase
            .from("reel_projects")
            .select(fallbackReelProjectColumns, { count: "exact" })
            .eq("user_id", userId)
            .order(projectOrderColumns.created, { ascending: false })
            .limit(projectHistoryLimit);
        };

        const projectResult = await loadProjects();
        if (projectResult.error) {
          throw projectResult.error;
        }

        const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
        const [activityResult, usageResult, creditTransactionsResult, usageAnalyticsResult, dailyGenerations, dailyThumbnails] = await Promise.all([
          supabase
            .from("activity_logs")
            .select("id,user_id,project_id,action,detail,created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(activityHistoryLimit),
          supabase
            .from("creator_usage")
            .select("*")
            .eq("user_id", userId)
            .maybeSingle(),
          supabase
            .from("credit_transactions")
            .select("credits_used")
            .eq("user_id", userId),
          supabase
            .from("usage_analytics")
            .select("tool_name,credits_consumed,created_at")
            .eq("user_id", userId),
          supabase
            .from("activity_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("action", "generated")
            .gte("created_at", todayStart.toISOString()),
          supabase
            .from("activity_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("action", "image_generated")
            .gte("created_at", todayStart.toISOString()),
        ]);
        let usageUnavailable = false;
        if (usageResult.error) {
          usageUnavailable = true;
          logSupabaseError("Unable to load creator usage.", usageResult.error);
        }

        let usageData = usageResult.data;
        if (!usageData) {
          const seededUsage = {
            user_id: userId,
            credits: 20,
            generations_count: 0,
            subscription_tier: "free",
          };
          const usageInsertResult = await supabase
            .from("creator_usage")
            .insert(seededUsage)
            .select("*")
            .maybeSingle();

          if (usageInsertResult.error) {
            usageUnavailable = true;
            logSupabaseError("Unable to create default creator usage row.", usageInsertResult.error);
            usageData = seededUsage;
          } else {
            usageData = usageInsertResult.data ?? seededUsage;
          }
        }

        if (isMounted) {
          const savedProjects: Project[] = ((projectResult.data ?? []) as unknown[])
            .filter(isReelProjectRow)
            .map(fromProjectRow);
          const usageAnalyticsRows = usageAnalyticsResult.error
            ? []
            : ((usageAnalyticsResult.data ?? []) as UsageAnalyticsRow[]);
          const toolCounts = usageAnalyticsRows.reduce<Record<string, number>>((counts, row) => {
            counts[row.tool_name] = (counts[row.tool_name] ?? 0) + 1;
            return counts;
          }, {});
          const mostUsedTool = Object.entries(toolCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "None yet";
          persistedTitleRef.current = new Map(
            savedProjects.map((savedProject) => [savedProject.id, savedProject.title]),
          );
          setHistory(savedProjects);
          setHistoryLoadError(false);
          if (activityResult.error) {
            logDevelopmentError("Unable to load activity.", activityResult.error);
            setActivityLogs([]);
            setActivityLoadError(true);
          } else {
            setActivityLogs((activityResult.data as ActivityLogRow[] | null) ?? []);
            setActivityLoadError(false);
          }
          setUsage({
            credits: usageData?.credits ?? 20,
            subscriptionTier: usageData?.subscription_tier ?? "free",
            generationsToday: dailyGenerations.error ? 0 : dailyGenerations.count ?? 0,
            generationsThisMonth: usageAnalyticsRows.filter((row) => Date.parse(row.created_at) >= monthStart.getTime()).length,
            generationsCount: usageData?.generations_count ?? 0,
            creditsUsed: creditTransactionsResult.error
              ? 0
              : (((creditTransactionsResult.data ?? []) as CreditTransactionRow[])
                .reduce((total, transaction) => total + transaction.credits_used, 0)),
            exportCount: usageData?.export_count ?? 0,
            imageGenerations: usageData?.image_generations ?? 0,
            videoGenerations: "video_generations" in (usageData ?? {}) ? usageData?.video_generations ?? 0 : 0,
            videoCreditsUsed: "video_credits_used" in (usageData ?? {}) ? usageData?.video_credits_used ?? 0 : 0,
            mostUsedTool,
            thumbnailGenerationsToday: dailyThumbnails.error ? 0 : dailyThumbnails.count ?? 0,
            totalProjects: projectResult.count ?? savedProjects.length,
          });
          setUsageStatus(usageUnavailable ? "unavailable" : "ready");
          if (usageUnavailable) {
            showToast("Usage unavailable", "info", "Credits could not be synced. Generation remains available.");
          }
        }
      } catch (error) {
        if (isMounted) {
          logDevelopmentError("Unable to load saved projects.", error);
          setHistoryLoadError(true);
          const message = error instanceof Error ? error.message : "Unable to load saved projects.";
          showToast("Projects unavailable", "error", message);
        }
      } finally {
        if (isMounted) {
          setIsHistoryLoading(false);
        }
      }
    };

    void fetchProjects();

    return () => {
      isMounted = false;
    };
  }, [showToast, userId]);

  useEffect(() => {
    const toastTimers = toastTimersRef.current;

    return () => {
      requestRef.current?.abort();
      if (titleSaveTimerRef.current) {
        window.clearTimeout(titleSaveTimerRef.current);
      }
      if (sessionSaveTimerRef.current) {
        window.clearTimeout(sessionSaveTimerRef.current);
      }
      toastTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (prompt) {
      setTypedPromptIdea("");
      return undefined;
    }

    const target = promptIdeas[promptIdeaIndex];
    let characterIndex = 0;
    let isDeleting = false;
    let typingTimer = 0;

    const typeNext = () => {
      if (!isDeleting) {
        characterIndex += 1;
        setTypedPromptIdea(target.slice(0, characterIndex));
        if (characterIndex === target.length) {
          isDeleting = true;
          typingTimer = window.setTimeout(typeNext, 1250);
          return;
        }
        typingTimer = window.setTimeout(typeNext, 34);
        return;
      }

      characterIndex -= 1;
      setTypedPromptIdea(target.slice(0, characterIndex));
      if (characterIndex === 0) {
        setPromptIdeaIndex((current) => (current + 1) % promptIdeas.length);
        return;
      }
      typingTimer = window.setTimeout(typeNext, 18);
    };

    typingTimer = window.setTimeout(typeNext, 180);
    return () => window.clearTimeout(typingTimer);
  }, [prompt, promptIdeaIndex]);

  useEffect(() => {
    if (
      !userId ||
      !project ||
      project.id.startsWith("pending-") ||
      isGenerating ||
      (prompt === project.prompt &&
        niche === project.niche &&
        language === project.language &&
        duration === project.duration &&
        tone === project.tone)
    ) {
      return undefined;
    }

    const originalProject = project;
    const projectId = project.id;
    const operationId = saveOperationRef.current + 1;
    saveOperationRef.current = operationId;
    setSaveState({ projectId, status: "saving" });

    sessionSaveTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("reel_projects")
            .update({
              category: niche,
              niche,
              language,
              duration,
              tone,
              prompt: prompt.trim(),
              status: "draft",
            })
            .eq("id", projectId)
            .eq("user_id", userId)
            .select(reelProjectColumns)
            .single();

          if (error) {
            throw error;
          }

          const savedProject = fromProjectRow(data as ReelProjectRow);
          setProject((current) => (current?.id === projectId ? savedProject : current));
          setHistory((current) =>
            current.map((entry) => (entry.id === projectId ? savedProject : entry)),
          );
          if (saveOperationRef.current === operationId) {
            setSaveState({ projectId, status: "saved" });
            void recordActivity(projectId, "saved", "Project changes saved");
          }
        } catch (error) {
          if (saveOperationRef.current === operationId) {
            setProject((current) => (current?.id === projectId ? originalProject : current));
            setHistory((current) =>
              current.map((entry) => (entry.id === projectId ? originalProject : entry)),
            );
            setPrompt(originalProject.prompt);
            setNiche(originalProject.niche);
            setLanguage(originalProject.language);
            setDuration(originalProject.duration);
            setTone(originalProject.tone);
            setSaveState({ projectId, status: "error" });
            showToast(
              "Failed to save",
              "error",
              error instanceof Error ? error.message : "Session changes were not saved.",
            );
          }
        }
      })();
    }, 700);

    return () => {
      if (sessionSaveTimerRef.current) {
        window.clearTimeout(sessionSaveTimerRef.current);
      }
    };
  }, [duration, isGenerating, language, niche, project, prompt, recordActivity, showToast, tone, userId]);

  const applyPreset = (preset: (typeof presets)[number]) => {
    const customPrompt = removePresetDirection(prompt);
    const direction = `${preset.name}: ${preset.direction}`;
    setPrompt(`${customPrompt ? `${customPrompt}\n\n` : ""}${presetMarker}${direction}${presetEndMarker}`);
    setTone(preset.tone);
    setActivePreset(preset.name);
  };

  const loadThumbnailAssets = useCallback(
    async (projectId: string) => {
      if (!userId || projectId.startsWith("pending-")) {
        setThumbnailAssets([]);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("thumbnail_assets")
        .select("id,project_id,user_id,prompt,image_url,provider,width,height,created_at,generation_ms,status,seed,prompt_hash,error_message")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        logDevelopmentError("Unable to load thumbnail assets.", error);
        setThumbnailAssets([]);
        return;
      }

      setThumbnailAssets((data as ThumbnailAsset[] | null) ?? []);
    },
    [userId],
  );

  const loadVoiceAsset = useCallback(
    async (projectId: string) => {
      if (!userId || projectId.startsWith("pending-")) {
        setVoiceAsset(null);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("voice_assets")
        .select("id,project_id,user_id,provider,voice_name,voice_style,language,emotion,pacing,audio_url,duration_ms,generation_ms,status,error_message,created_at")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        logDevelopmentError("Unable to load voice asset.", error);
        setVoiceAsset(null);
        return;
      }

      const nextAsset = (data as VoiceAsset | null) ?? null;
      setVoiceAsset(nextAsset);
      if (nextAsset) {
        setVoiceStyle(nextAsset.voice_style ?? "Cinematic narrator");
        setVoiceLanguage(nextAsset.language ?? "English");
        setVoiceEmotion(nextAsset.emotion ?? "Balanced");
        setVoicePacing(nextAsset.pacing ?? "Medium");
      }
    },
    [userId],
  );

  const loadVideoAssets = useCallback(
    async (projectId: string) => {
      if (!userId || projectId.startsWith("pending-")) {
        setVideoAssets([]);
        setVideoAsset(null);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("video_assets")
        .select("id,project_id,user_id,provider,video_url,thumbnail_url,resolution,aspect_ratio,quality,duration_seconds,generation_ms,status,error_message,created_at")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) {
        logDevelopmentError("Unable to load video assets.", error);
        setVideoAssets([]);
        setVideoAsset(null);
        return;
      }

      const nextAssets = (data as VideoAsset[] | null) ?? [];
      setVideoAssets(nextAssets);
      const latest = nextAssets[0] ?? null;
      setVideoAsset(latest);
      if (latest) {
        setVideoProvider(latest.provider === "placeholder" ? "veo" : latest.provider);
        setVideoResolution(latest.resolution);
        setVideoAspectRatio(latest.aspect_ratio);
        setVideoDuration(latest.duration_seconds as VideoDuration);
        setVideoQuality(latest.quality);
      }
    },
    [userId],
  );

  const generateVoiceAsset = useCallback(
    async (targetProject: Project, variation = false) => {
      if (!userId || targetProject.id.startsWith("pending-") || isVoiceGenerating) {
        return;
      }

      if (!hasCredits(creditCosts.voiceover, "Voiceover")) {
        return;
      }

      setIsVoiceGenerating(true);
      try {
        const response = await fetch("/api/generate-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: targetProject.id,
            voiceover: targetProject.outputs.voiceover,
            language: voiceLanguage,
            voiceStyle: variation ? `${voiceStyle} variation` : voiceStyle,
            emotion: voiceEmotion,
            pacing: voicePacing,
          }),
        });
        const result = (await response.json()) as {
          success?: unknown;
          provider?: unknown;
          audioUrl?: unknown;
          downloadUrl?: unknown;
          durationMs?: unknown;
          generationMs?: unknown;
          status?: unknown;
          message?: unknown;
          voiceName?: unknown;
        };

        const supabase = createClient();
        if (result.success !== true || typeof result.audioUrl !== "string") {
          const message = typeof result.message === "string" ? result.message : "Voice generation failed.";
          const status = result.status === "not_configured" || result.status === "quota_limited" ? result.status : "failed";
          const { data, error } = await supabase
            .from("voice_assets")
            .insert({
              project_id: targetProject.id,
              user_id: userId,
              provider: typeof result.provider === "string" && (result.provider === "elevenlabs" || result.provider === "openai-voice")
                ? result.provider
                : "placeholder",
              voice_name: "Placeholder",
              voice_style: voiceStyle,
              language: voiceLanguage,
              emotion: voiceEmotion,
              pacing: voicePacing,
              audio_url: null,
              duration_ms: null,
              generation_ms: typeof result.generationMs === "number" ? result.generationMs : null,
              status,
              error_message: message,
            })
            .select("id,project_id,user_id,provider,voice_name,voice_style,language,emotion,pacing,audio_url,duration_ms,generation_ms,status,error_message,created_at")
            .single();
          if (!error && data) {
            setVoiceAsset(data as VoiceAsset);
          }
          showToast(status === "not_configured" ? "Voice provider not configured" : "Voice generation failed", "error", message);
          return;
        }

        const audioBlob = dataUrlToBlob(result.audioUrl);
        const storagePath = `${userId}/${targetProject.id}/${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage
          .from("voice-assets")
          .upload(storagePath, audioBlob, { contentType: "audio/mpeg", upsert: false });
        if (uploadError) {
          throw uploadError;
        }

        const { data: publicAudio } = supabase.storage.from("voice-assets").getPublicUrl(storagePath);
        const { data, error } = await supabase
          .from("voice_assets")
          .insert({
            project_id: targetProject.id,
            user_id: userId,
            provider: result.provider === "openai-voice" ? "openai-voice" : "elevenlabs",
            voice_name: typeof result.voiceName === "string" ? result.voiceName : result.provider === "openai-voice" ? "OpenAI Voice" : "ElevenLabs",
            voice_style: voiceStyle,
            language: voiceLanguage,
            emotion: voiceEmotion,
            pacing: voicePacing,
            audio_url: publicAudio.publicUrl,
            duration_ms: typeof result.durationMs === "number" ? result.durationMs : null,
            generation_ms: typeof result.generationMs === "number" ? result.generationMs : null,
            status: "completed",
            error_message: null,
          })
          .select("id,project_id,user_id,provider,voice_name,voice_style,language,emotion,pacing,audio_url,duration_ms,generation_ms,status,error_message,created_at")
          .single();
        if (error) {
          throw error;
        }

        setVoiceAsset(data as VoiceAsset);
        await consumeCredits("voiceover", creditCosts.voiceover);
        void recordActivity(targetProject.id, "saved", "Voice asset generated");
        showToast("Voice asset generated", "success", "Your MP3 narration is ready.");
      } catch (error) {
        showToast("Voice generation failed", "error", error instanceof Error ? error.message : "Unable to generate voice audio.");
      } finally {
        setIsVoiceGenerating(false);
      }
    },
    [consumeCredits, hasCredits, isVoiceGenerating, recordActivity, showToast, userId, voiceEmotion, voiceLanguage, voicePacing, voiceStyle],
  );

  const generateVideoAsset = useCallback(
    async (targetProject: Project, variation = false) => {
      if (!userId || targetProject.id.startsWith("pending-") || isVideoGenerating) {
        return;
      }

      if (!hasCredits(creditCosts.videoGeneration, "Video generation")) {
        return;
      }

      setIsVideoGenerating(true);
      try {
        const thumbnailUrl = manualVideoThumbnailUrl.trim() || targetProject.thumbnailUrl || "";
        if (videoProvider === "runway" && !thumbnailUrl) {
          showToast(
            "Runway needs a thumbnail image URL",
            "error",
            "Runway needs a thumbnail image URL. Generate thumbnail or paste manual image URL.",
          );
          return;
        }

        const fetchResponse = await fetch("/api/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: targetProject.id,
            provider: videoProvider,
            duration: videoDuration,
            resolution: videoResolution,
            aspectRatio: videoAspectRatio,
            quality: variation ? "quality" : videoQuality,
            productionPack: targetProject.outputs.productionPack,
            thumbnailUrl,
          }),
        });
        const response = (await fetchResponse.json()) as {
          success?: unknown;
          provider?: unknown;
          status?: unknown;
          error?: unknown;
          message?: unknown;
          responseBody?: unknown;
          veoError?: unknown;
          runwayError?: unknown;
          fallbackAttempted?: unknown;
          finalProvider?: unknown;
          videoUrl?: unknown;
          downloadUrl?: unknown;
          thumbnailUrl?: unknown;
          duration?: unknown;
          generationMs?: unknown;
          jobId?: unknown;
        };

        const status = typeof response.status === "string" ? response.status : "failed";
        const completed = response.success === true && status === "completed";
        if (!completed) {
          console.log(
            "VIDEO RESPONSE FULL",
            JSON.stringify(response, null, 2),
          );
        }
        if (response.fallbackAttempted === true) {
          showToast("Veo endpoint failed, trying Runway fallback", "info", "Runway was attempted after the Veo endpoint returned an error.");
        }
        const result = response;
        const isDemoVideo = result.provider === "demo";
        const errorMessage = typeof result.error === "string"
          ? result.error
          : typeof result.message === "string"
            ? result.message
            : "Provider could not complete this render. Check configuration and try again.";
        const supabase = createClient();
        const { data, error } = await supabase
          .from("video_assets")
          .insert({
            project_id: targetProject.id,
            user_id: userId,
            provider: typeof result.provider === "string" ? result.provider : "placeholder",
            video_url: typeof result.videoUrl === "string"
              ? result.videoUrl
              : typeof result.downloadUrl === "string"
                ? result.downloadUrl
                : null,
            thumbnail_url: typeof result.thumbnailUrl === "string" ? result.thumbnailUrl : null,
            resolution: videoResolution,
            aspect_ratio: videoAspectRatio,
            quality: variation ? "quality" : videoQuality,
            duration_seconds: typeof result.duration === "number" ? result.duration : videoDuration,
            generation_ms: typeof result.generationMs === "number" ? result.generationMs : null,
            status: completed ? "completed" : status,
            error_message: isDemoVideo
              ? [result.veoError, result.runwayError].filter((value): value is string => typeof value === "string" && Boolean(value.trim())).join(" | ") || errorMessage
              : completed ? null : errorMessage,
          })
          .select("id,project_id,user_id,provider,video_url,thumbnail_url,resolution,aspect_ratio,quality,duration_seconds,generation_ms,status,error_message,created_at")
          .single();

        if (error) {
          throw error;
        }

        const savedAsset = data as VideoAsset;
        setVideoAsset(savedAsset);
        setVideoAssets((current) => [savedAsset, ...current.filter((asset) => asset.id !== savedAsset.id)].slice(0, 8));

        if (completed) {
          if (!isDemoVideo) {
            await consumeCredits("video_generation", creditCosts.videoGeneration);
          }
          void recordActivity(targetProject.id, "video_generated", `${String(savedAsset.provider).toUpperCase()} video render generated`);
          if (isDemoVideo) {
            showToast("Demo video generated", "info", "Provider credits required for real render.");
          } else {
            showToast("Video render generated", "success", "Your Video Studio asset is ready.");
          }
        } else {
          showToast(
            "Video generation failed",
            "error",
            errorMessage,
          );
        }
      } catch (error) {
        showToast("Video generation failed", "error", error instanceof Error ? error.message : "Unable to generate video asset.");
      } finally {
        setIsVideoGenerating(false);
      }
    },
    [
      isVideoGenerating,
      consumeCredits,
      hasCredits,
      recordActivity,
      showToast,
      userId,
      videoAspectRatio,
      videoDuration,
      videoProvider,
      videoQuality,
      videoResolution,
      manualVideoThumbnailUrl,
    ],
  );

  const generateThumbnail = useCallback(
    async (targetProject: Project, regeneration = false, variation = false) => {
      if (!userId || targetProject.id.startsWith("pending-")) {
        return;
      }

      if (thumbnailCooldownSeconds > 0) {
        return;
      }

      if (usage.thumbnailGenerationsToday >= dailyThumbnailLimit) {
        showToast("Daily thumbnail limit reached", "error", "Try again tomorrow or use your cached image.");
        return;
      }

      if (!hasCredits(creditCosts.thumbnail, "Thumbnail generation")) {
        return;
      }

      setIsThumbnailGenerating(true);
      setThumbnailGenerationState("queued");
      setThumbnailFailure((current) => (current?.projectId === targetProject.id ? null : current));
      const stateTimers = [
        window.setTimeout(() => setThumbnailGenerationState("generating"), 350),
        window.setTimeout(() => setThumbnailGenerationState("provider-switching"), 4500),
      ];
      try {
        const seed = variation ? Math.floor(Math.random() * 2147483647) : undefined;
        const response = await fetch("/api/generate-thumbnail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: targetProject.outputs.thumbnailPrompt,
            title: targetProject.title,
            mode: thumbnailMode,
            seed,
            variation,
          }),
        });
        const result = (await response.json()) as {
          success?: unknown;
          imageUrl?: unknown;
          imageDataUrl?: unknown;
          mimeType?: unknown;
          provider?: unknown;
          generationMs?: unknown;
          generationTimeMs?: unknown;
          width?: unknown;
          height?: unknown;
          seed?: unknown;
          promptHash?: unknown;
          fallbackReason?: unknown;
          placeholder?: unknown;
          quotaReached?: unknown;
          error?: unknown;
        };
        const generationMs =
          typeof result.generationMs === "number"
            ? result.generationMs
            : typeof result.generationTimeMs === "number"
              ? result.generationTimeMs
              : null;

        if (result.provider === "placeholder" || result.placeholder === true) {
          const message =
            typeof result.error === "string"
              ? result.error
              : result.quotaReached === true
                ? "Thumbnail quota reached. Try again later."
                : "Image providers are unavailable. Showing a placeholder preview.";
          const placeholderProject: Project = {
            ...targetProject,
            imageProvider: "placeholder",
            generationTimeMs: generationMs,
          };
          setProject((current) => (current?.id === targetProject.id ? placeholderProject : current));
          setHistory((current) =>
            current.map((entry) => (entry.id === targetProject.id ? placeholderProject : entry)),
          );

          const supabase = createClient();
          const { data, error } = await supabase
            .from("reel_projects")
            .update({
              image_provider: "placeholder",
              generation_time_ms: placeholderProject.generationTimeMs,
            })
            .eq("id", targetProject.id)
            .eq("user_id", userId)
            .select(reelProjectColumns)
            .single();

          if (error) {
            throw error;
          }

          const savedPlaceholderProject = fromProjectRow(data as ReelProjectRow);
          setProject((current) => (current?.id === savedPlaceholderProject.id ? savedPlaceholderProject : current));
          setHistory((current) =>
            current.map((entry) => (entry.id === savedPlaceholderProject.id ? savedPlaceholderProject : entry)),
          );
          await Promise.all([
            supabase.from("generation_history").insert({
              project_id: savedPlaceholderProject.id,
              user_id: userId,
              event_type: regeneration ? "regeneration" : "thumbnail",
              snapshot: data,
              thumbnail_url: null,
            }),
            supabase.from("thumbnail_assets").insert({
              project_id: savedPlaceholderProject.id,
              user_id: userId,
              prompt: targetProject.outputs.thumbnailPrompt,
              image_url: null,
              provider: "placeholder",
              width: typeof result.width === "number" ? result.width : 1280,
              height: typeof result.height === "number" ? result.height : 720,
              generation_ms: generationMs,
              status: "placeholder",
              seed: typeof result.seed === "number" ? result.seed : null,
              prompt_hash: typeof result.promptHash === "string" ? result.promptHash : null,
              error_message: message,
            }),
          ]);
          setThumbnailFailure({
            projectId: targetProject.id,
            message,
            quotaReached: result.quotaReached === true,
          });
          if (result.quotaReached === true) {
            window.localStorage.setItem(thumbnailCooldownStorageKey, String(Date.now() + 60000));
            setThumbnailCooldownSeconds(60);
          }
          setThumbnailGenerationState("failed");
          void loadThumbnailAssets(savedPlaceholderProject.id);
          void loadTimeline(savedPlaceholderProject.id);
          showToast(
            result.quotaReached === true ? "Thumbnail quota reached" : "Placeholder thumbnail ready",
            result.quotaReached === true ? "error" : "success",
            message,
          );
          return;
        }

        if (
          !response.ok ||
          (typeof result.imageDataUrl !== "string" && typeof result.imageUrl !== "string") ||
          typeof result.mimeType !== "string" ||
          (result.provider !== "gemini" && result.provider !== "pollinations") ||
          generationMs === null
        ) {
          throw new Error(
            response.status === 429
              ? "Thumbnail quota reached. Try again later."
              : typeof result.error === "string"
                ? result.error
                : "Thumbnail generation failed.",
          );
        }

        const supabase = createClient();
        const imageDataUrl = typeof result.imageUrl === "string" ? result.imageUrl : result.imageDataUrl;
        const imageBlob = await fetch(imageDataUrl as string).then((generatedImage) => generatedImage.blob());
        const extension = result.mimeType.includes("jpeg") ? "jpg" : "png";
        const storagePath = `${userId}/${targetProject.id}/${Date.now()}-${typeof result.seed === "number" ? result.seed : "render"}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("reel-thumbnails")
          .upload(storagePath, imageBlob, { contentType: result.mimeType, upsert: false });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicImage } = supabase.storage.from("reel-thumbnails").getPublicUrl(storagePath);
        const { data, error } = await supabase
          .from("reel_projects")
          .update({
            thumbnail_url: publicImage.publicUrl,
            image_provider: result.provider satisfies ImageProvider,
            generation_time_ms: generationMs,
          })
          .eq("id", targetProject.id)
          .eq("user_id", userId)
          .select(reelProjectColumns)
          .single();

        if (error) {
          throw error;
        }

        const updatedProject = fromProjectRow(data as ReelProjectRow);
        setProject((current) => (current?.id === updatedProject.id ? updatedProject : current));
        setHistory((current) =>
          current.map((entry) => (entry.id === updatedProject.id ? updatedProject : entry)),
        );
        await Promise.all([
          supabase.from("generation_history").insert({
            project_id: updatedProject.id,
            user_id: userId,
            event_type: regeneration ? "regeneration" : "thumbnail",
            snapshot: data,
            thumbnail_url: updatedProject.thumbnailUrl,
          }),
          supabase.from("thumbnail_assets").insert({
            project_id: updatedProject.id,
            user_id: userId,
            prompt: targetProject.outputs.thumbnailPrompt,
            image_url: updatedProject.thumbnailUrl,
            provider: result.provider,
            width: typeof result.width === "number" ? result.width : 1280,
            height: typeof result.height === "number" ? result.height : 720,
            generation_ms: generationMs,
            status: "completed",
            seed: typeof result.seed === "number" ? result.seed : null,
            prompt_hash: typeof result.promptHash === "string" ? result.promptHash : null,
            error_message: null,
          }),
          recordActivity(
            updatedProject.id,
            "image_generated",
            `${regeneration ? "Thumbnail regenerated" : "Thumbnail generated"} via ${result.provider}`,
          ),
        ]);
        setUsage((current) => ({
          ...current,
          thumbnailGenerationsToday: current.thumbnailGenerationsToday + 1,
        }));
        await consumeCredits("thumbnail", creditCosts.thumbnail);
        setThumbnailFailure(null);
        setThumbnailGenerationState("completed");
        setThumbnailCooldownSeconds(0);
        void loadThumbnailAssets(updatedProject.id);
        void loadTimeline(updatedProject.id);
        showToast(
          result.fallbackReason === "gemini_quota"
            ? "Thumbnail created with free fallback"
            : regeneration
              ? "Thumbnail regenerated"
              : "Thumbnail created",
          "success",
          "Your visual asset is ready to download.",
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to create a thumbnail right now.";
        const quotaReached = message === "Thumbnail quota reached. Try again later.";
        if (quotaReached) {
          window.localStorage.setItem(thumbnailCooldownStorageKey, String(Date.now() + 60000));
          setThumbnailCooldownSeconds(60);
        }
        setThumbnailFailure({
          projectId: targetProject.id,
          message,
          quotaReached,
        });
        setThumbnailGenerationState("failed");
        void (async () => {
          const { error: assetError } = await createClient().from("thumbnail_assets").insert({
            project_id: targetProject.id,
            user_id: userId,
            prompt: targetProject.outputs.thumbnailPrompt,
            image_url: null,
            provider: "failed",
            width: 1280,
            height: 720,
            generation_ms: null,
            status: "failed",
            seed: null,
            prompt_hash: null,
            error_message: message,
          });
          if (assetError) {
            logDevelopmentError("Unable to record failed thumbnail asset.", assetError);
          }
        })();
        showToast(
          quotaReached ? "Thumbnail quota reached" : "Image generation failed",
          "error",
          message,
        );
      } finally {
        stateTimers.forEach((timer) => window.clearTimeout(timer));
        setIsThumbnailGenerating(false);
        window.setTimeout(() => setThumbnailGenerationState("idle"), 1200);
      }
    },
    [consumeCredits, hasCredits, loadThumbnailAssets, loadTimeline, recordActivity, showToast, thumbnailCooldownSeconds, thumbnailMode, usage.thumbnailGenerationsToday, userId],
  );

  const recordExport = useCallback(
    (format: "copy" | "txt" | "markdown" | "json" | "pdf" | "zip") => {
      if (!userId || !project || project.id.startsWith("pending-")) {
        return;
      }

      if (!hasCredits(creditCosts.publishingExport, "Publishing export")) {
        return;
      }

      const projectId = project.id;
      setProject((current) =>
        current?.id === projectId ? { ...current, exportCount: current.exportCount + 1 } : current,
      );
      setHistory((current) =>
        current.map((entry) =>
          entry.id === projectId ? { ...entry, exportCount: entry.exportCount + 1 } : entry,
        ),
      );
      setUsage((current) => ({ ...current, exportCount: current.exportCount + 1 }));

      void (async () => {
        try {
          const supabase = createClient();
          const [updateResult, creditResult] = await Promise.all([
            supabase
              .from("reel_projects")
              .update({ export_count: project.exportCount + 1 })
              .eq("id", projectId)
              .eq("user_id", userId),
            consumeCredits("publishing_export", creditCosts.publishingExport),
            recordActivity(
              projectId,
              "exported",
              format === "zip" && videoAsset?.project_id === projectId
                ? "Video package exported"
              : `${format.toUpperCase()} package exported`,
            ),
          ]);
          if (updateResult.error || !creditResult) {
            throw updateResult.error ?? new Error("Credits could not be updated.");
          }
        } catch {
          setProject((current) =>
            current?.id === projectId ? { ...current, exportCount: Math.max(0, current.exportCount - 1) } : current,
          );
          setHistory((current) =>
            current.map((entry) =>
              entry.id === projectId ? { ...entry, exportCount: Math.max(0, entry.exportCount - 1) } : entry,
            ),
          );
          setUsage((current) => ({ ...current, exportCount: Math.max(0, current.exportCount - 1) }));
          showToast("Usage sync failed", "error", "Your export completed, but activity tracking could not be saved.");
        }
      })();
    },
    [consumeCredits, hasCredits, project, recordActivity, showToast, userId, videoAsset],
  );

  const handleGenerate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!prompt.trim() || isGenerating) {
      return;
    }

    if (userId && !hasCredits(packageCreditCost(), "Storyboard and Production Pack generation")) {
      const message = "You do not have enough credits for storyboard and production pack generation. Your saved projects and exports still work.";
      setErrorMessage(message);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsGenerating(true);
    setCopiedTab(null);
    setErrorMessage(null);
    setProject(null);
    setVoiceAsset(null);
    setVideoAsset(null);
    setVideoAssets([]);
    setPublishingExport(null);
    setStreamedOutputs(emptyGeneratedOutputs());
    setStreamingTab("hook");
    setCompletedTabs([]);
    setActiveTab("hook");
    setGenerationStatusMessage(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), niche, language, duration, tone }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: unknown };
        throw new Error(typeof payload.error === "string" ? payload.error : "Generation failed. Please try again.");
      }

      if (!response.body) {
        throw new Error("Streaming output is unavailable. Please try again.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let outputs = emptyGeneratedOutputs();
      let generationModel = "gemini-2.5-flash";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const streamEvent = JSON.parse(line) as unknown;
          if (!isStreamEvent(streamEvent)) {
            throw new Error("The generation stream returned an unexpected response.");
          }

          if (streamEvent.type === "retrying") {
            setGenerationStatusMessage(streamEvent.message);
          }

          if (streamEvent.type === "start") {
            setGenerationStatusMessage(null);
            setStreamingTab(streamEvent.key);
            setActiveTab(streamEvent.key);
          }

          if (streamEvent.type === "delta") {
            outputs = {
              ...outputs,
              [streamEvent.key]: outputs[streamEvent.key] + streamEvent.text,
            };
            setStreamedOutputs(outputs);
          }

          if (streamEvent.type === "complete") {
            setCompletedTabs((current) =>
              current.includes(streamEvent.key) ? current : [...current, streamEvent.key],
            );
          }

          if (streamEvent.type === "error") {
            throw new Error(streamEvent.error);
          }

          if (streamEvent.type === "done" && streamEvent.model) {
            generationModel = streamEvent.model;
          }
        }
      }

      if (!isGeneratedOutputs(outputs)) {
        throw new Error("The generated output was incomplete. Please try again.");
      }

      const nextProject: Project = {
        id: `pending-${Date.now()}`,
        title: createProjectTitle(prompt.trim()),
        category: niche,
        prompt: prompt.trim(),
        niche,
        language,
        duration,
        tone,
        generationModel,
        status: "generated",
        thumbnailUrl: null,
        imageProvider: null,
        generationTimeMs: null,
        exportCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        outputs,
      };
      setProject(nextProject);
      showToast("Reel package generated", "success", "Your storyboard and creative assets are ready to use.");

      if (userId) {
        setSaveState({ projectId: nextProject.id, status: "saving" });
        setHistory((current) => [nextProject, ...current].slice(0, 50));

        void (async () => {
          try {
            const supabase = createClient();
            const { data, error } = await supabase
              .from("reel_projects")
              .insert(toProjectInsert(nextProject, userId))
              .select(reelProjectColumns)
              .single();

            if (error) {
              throw error;
            }

            const savedProject = fromProjectRow(data as ReelProjectRow);
            persistedTitleRef.current.set(savedProject.id, savedProject.title);
            setProject((current) => (current?.id === nextProject.id ? savedProject : current));
            setHistory((current) =>
              current.map((entry) => (entry.id === nextProject.id ? savedProject : entry)),
            );
            setSaveState((current) =>
              current?.projectId === nextProject.id
                ? { projectId: savedProject.id, status: "saved" }
                : current,
            );
            await Promise.all([
              supabase.from("generation_history").insert({
                project_id: savedProject.id,
                user_id: userId,
                event_type: "generation",
                snapshot: data,
              }),
              recordActivity(savedProject.id, "generated", "Reel package generated"),
            ]);
            await consumeCredits("storyboard", creditCosts.storyboard);
            await consumeCredits("production_pack", creditCosts.productionPack);
            setUsage((current) => ({
              ...current,
              generationsToday: current.generationsToday + 1,
              totalProjects: current.totalProjects + 1,
            }));
            void loadTimeline(savedProject.id);
          } catch (error) {
            setHistory((current) => current.filter((entry) => entry.id !== nextProject.id));
            setSaveState((current) =>
              current?.projectId === nextProject.id
                ? { projectId: nextProject.id, status: "error" }
                : current,
            );
            showToast(
              "Could not save project",
              "error",
              error instanceof Error ? error.message : "Your output is still visible, but was not saved.",
            );
          }
        })();
      } else {
        setSaveState(null);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : "Unable to generate your reel package.";
        setErrorMessage(message);
        showToast("Generation failed", "error", message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
        setStreamingTab(null);
        setGenerationStatusMessage(null);
      }
    }
  };

  const loadProject = (savedProject: Project) => {
    setProject(savedProject);
    setPrompt(savedProject.prompt);
    setNiche(savedProject.niche);
    setLanguage(savedProject.language);
    setDuration(savedProject.duration);
    setTone(savedProject.tone);
    setActivePreset(getPresetNameFromPrompt(savedProject.prompt));
    setActiveTab("hook");
    setStreamedOutputs(null);
    setStreamingTab(null);
    setCompletedTabs(outputTabs.map((tab) => tab.key));
    setIsHistoryOpen(false);
    setSaveState({ projectId: savedProject.id, status: "saved" });
    setPublishingExport(null);
    setThumbnailFailure((current) => (current?.projectId === savedProject.id ? current : null));
    void loadTimeline(savedProject.id);
    void loadThumbnailAssets(savedProject.id);
    void loadVoiceAsset(savedProject.id);
    void loadVideoAssets(savedProject.id);
  };

  const saveProjectTitle = (projectId: string, value: string, persistedTitle: string) => {
    if (!userId || projectId.startsWith("pending-")) {
      return;
    }

    const nextTitle = value.trim() || "New reel concept";
    const operationId = saveOperationRef.current + 1;
    saveOperationRef.current = operationId;
    setSaveState({ projectId, status: "saving" });

    if (nextTitle === persistedTitle) {
      setProject((current) => (current?.id === projectId ? { ...current, title: nextTitle } : current));
      setHistory((current) => current.map((entry) => (entry.id === projectId ? { ...entry, title: nextTitle } : entry)));
      setSaveState({ projectId, status: "saved" });
      return;
    }

    void (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("reel_projects")
          .update({ title: nextTitle })
          .eq("id", projectId)
          .eq("user_id", userId)
          .select(reelProjectColumns)
          .single();

        if (error) {
          throw error;
        }

        const savedProject = fromProjectRow(data as ReelProjectRow);
        persistedTitleRef.current.set(projectId, savedProject.title);
        setProject((current) => (current?.id === projectId ? savedProject : current));
        setHistory((current) => current.map((entry) => (entry.id === projectId ? savedProject : entry)));
        if (saveOperationRef.current === operationId) {
          setSaveState({ projectId, status: "saved" });
          void recordActivity(projectId, "renamed", "Project title updated");
        }
      } catch (error) {
        if (saveOperationRef.current === operationId) {
          setProject((current) => (current?.id === projectId ? { ...current, title: persistedTitle } : current));
          setHistory((current) =>
            current.map((entry) => (entry.id === projectId ? { ...entry, title: persistedTitle } : entry)),
          );
          setSaveState({ projectId, status: "error" });
          showToast(
            "Failed to save title",
            "error",
            error instanceof Error ? error.message : "Your title was restored.",
          );
        }
      }
    })();
  };

  const updateProjectTitle = (value: string) => {
    if (!userId || !project || project.id.startsWith("pending-")) {
      return;
    }

    const projectId = project.id;
    const optimisticTitle = value.slice(0, 120);
    const persistedTitle = persistedTitleRef.current.get(projectId) ?? project.title;
    setProject((current) => (current?.id === projectId ? { ...current, title: optimisticTitle } : current));
    setHistory((current) =>
      current.map((entry) => (entry.id === projectId ? { ...entry, title: optimisticTitle } : entry)),
    );

    if (titleSaveTimerRef.current) {
      window.clearTimeout(titleSaveTimerRef.current);
    }

    setSaveState({ projectId, status: "saving" });
    titleSaveTimerRef.current = window.setTimeout(() => {
      saveProjectTitle(projectId, optimisticTitle, persistedTitle);
    }, 650);
  };

  const finishProjectTitleEdit = () => {
    if (!project || project.id.startsWith("pending-")) {
      return;
    }

    if (titleSaveTimerRef.current) {
      window.clearTimeout(titleSaveTimerRef.current);
      titleSaveTimerRef.current = null;
    }

    saveProjectTitle(project.id, project.title, persistedTitleRef.current.get(project.id) ?? project.title);
    setEditingTitleProjectId(null);
  };

  const cancelProjectTitleEdit = () => {
    if (!project || project.id.startsWith("pending-")) {
      return;
    }

    if (titleSaveTimerRef.current) {
      window.clearTimeout(titleSaveTimerRef.current);
      titleSaveTimerRef.current = null;
    }

    const persistedTitle = persistedTitleRef.current.get(project.id) ?? project.title;
    setProject((current) => (current?.id === project.id ? { ...current, title: persistedTitle } : current));
    setHistory((current) =>
      current.map((entry) => (entry.id === project.id ? { ...entry, title: persistedTitle } : entry)),
    );
    setSaveState({ projectId: project.id, status: "saved" });
    setEditingTitleProjectId(null);
  };

  const deleteProject = async (id: string) => {
    if (!userId || id.startsWith("pending-") || deletingProjectIds.includes(id)) {
      return;
    }

    const deletedProject = history.find((savedProject) => savedProject.id === id);
    if (!deletedProject) {
      return;
    }

    const wasActiveProject = project?.id === id;
    if (wasActiveProject) {
      if (titleSaveTimerRef.current) {
        window.clearTimeout(titleSaveTimerRef.current);
      }
      if (sessionSaveTimerRef.current) {
        window.clearTimeout(sessionSaveTimerRef.current);
      }
      saveOperationRef.current += 1;
    }
    setDeletingProjectIds((current) => [...current, id]);
    setHistory((current) => current.filter((savedProject) => savedProject.id !== id));
    if (wasActiveProject) {
      setProject(null);
      setStreamedOutputs(null);
      setCompletedTabs([]);
      setActiveTab("hook");
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("reel_projects")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      persistedTitleRef.current.delete(id);
      showToast("Project deleted", "info", "Removed from your saved projects.");
      setProjectPendingDelete(null);
    } catch (error) {
      setHistory((current) => [deletedProject, ...current]);
      if (wasActiveProject) {
        setProject(deletedProject);
      }
      showToast(
        "Delete failed",
        "error",
        error instanceof Error ? error.message : "The project could not be removed.",
      );
    } finally {
      setDeletingProjectIds((current) => current.filter((projectId) => projectId !== id));
    }
  };

  const copyOutput = async (key: OutputKey) => {
    const outputs = project?.outputs ?? streamedOutputs;
    if (!outputs || !outputs[key].trim()) {
      return;
    }

    try {
      await window.navigator.clipboard.writeText(outputs[key]);
      setCopiedTab(key);
      window.setTimeout(() => setCopiedTab(null), 1500);
      showToast(`${tabs.find((tab) => tab.key === key)?.label ?? "Output"} copied`, "success", "Ready to paste.");
    } catch {
      setCopiedTab(null);
      showToast("Unable to copy", "error", "Clipboard access was unavailable. Please try again.");
    }
  };

  return (
    <>
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <section id="workspace" className="relative z-10 w-full max-w-full scroll-mt-24 overflow-x-hidden px-4 pb-16 pt-[5.5rem] sm:px-5 sm:py-28 lg:scroll-mt-24 lg:px-4 lg:py-32">
        <div id="dashboard" className="absolute -top-20" aria-hidden="true" />
        <div className="absolute left-1/2 top-24 -z-10 h-[24rem] w-[min(24rem,100vw)] -translate-x-1/2 rounded-full bg-cyberBlue/10 blur-[120px] sm:h-[32rem] sm:w-[32rem]" />
        <div className="mx-auto w-full min-w-0 lg:max-w-7xl">
        <SectionHeading
          eyebrow="AI workspace"
          title="Build your next reel package live."
          description={
            userId
              ? "Shape the creative direction, generate creator-ready assets with Gemini, and revisit projects saved securely to your workspace."
              : "Shape the creative direction and generate creator-ready assets with Gemini in a cinematic workspace preview."
          }
        />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-120px" }}
          variants={fadeUp}
          className="glass-panel relative w-full max-w-full overflow-hidden rounded-[1.25rem] border-white/15 shadow-[0_34px_120px_rgba(0,0,0,0.44)] md:rounded-[2rem]"
        >
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyberBlue/70 to-transparent" />
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-3 sm:gap-3 sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FB7185] sm:h-3 sm:w-3" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24] sm:h-3 sm:w-3" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#34D399] sm:h-3 sm:w-3" />
              <p className="ml-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.2em] text-mist sm:ml-3 sm:text-xs sm:tracking-[0.26em]">ReelMind studio</p>
            </div>
            <div className="flex min-w-0 flex-wrap justify-end gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-mist transition hover:border-cyberBlue/25 hover:text-frost lg:hidden"
              >
                Projects
              </button>
              <span className="rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-2.5 py-1 text-xs text-cyberBlue sm:px-3">
                <span className="status-pulse mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                Gemini powered
              </span>
              <span className="hidden rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-mist sm:block">
                Server secured
              </span>
            </div>
          </div>

          <div className="grid min-w-0 lg:grid-cols-[19rem_minmax(0,1fr)]">
            <aside className="hidden border-r border-white/10 bg-white/[0.025] p-5 lg:block">
              <HistoryPanel
                activeProjectId={project?.id}
                history={history}
                visibleHistory={visibleHistory}
                isLoading={isHistoryLoading}
                hasError={historyLoadError}
                canPersist={Boolean(userId)}
                deletingProjectIds={deletingProjectIds}
                query={historyQuery}
                sort={historySort}
                onDelete={setProjectPendingDelete}
                onLoad={loadProject}
                onQueryChange={setHistoryQuery}
                onSortChange={setHistorySort}
              />
              {userId ? <ActivitySidebar activity={activityLogs} usage={usage} hasError={activityLoadError} /> : null}
            </aside>

            <div className="order-1 grid w-full min-w-0 max-w-full gap-4 p-4 sm:p-5 md:p-6 lg:order-2 xl:grid-cols-[22rem_minmax(0,1fr)] xl:p-7">
              <form
                onSubmit={handleGenerate}
                className="w-full min-w-0 max-w-full rounded-2xl border border-white/10 bg-ink/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_44px_rgba(0,0,0,0.18)] sm:rounded-3xl sm:p-5"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violetGlow">Prompt studio</p>
                  <h3 className="mt-2 text-xl font-semibold text-frost">Describe your reel</h3>
                </div>

                <label className="mt-5 block min-w-0 text-xs font-semibold uppercase tracking-[0.2em] text-mist">
                  Prompt
                  <textarea
                    ref={promptRef}
                    value={prompt}
                    onChange={(event) => {
                      setPrompt(event.target.value);
                      setActivePreset(getPresetNameFromPrompt(event.target.value));
                    }}
                    rows={5}
                    placeholder={typedPromptIdea || "What should your reel be about?"}
                    className="workspace-input mt-2 block w-full max-w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-normal leading-6 text-frost outline-none transition placeholder:text-mist/55 focus:border-cyberBlue/45 focus:bg-cyberBlue/[0.04] sm:p-3.5"
                  />
                </label>
                {!prompt ? (
                  <button
                    type="button"
                    onClick={() => setPrompt(promptIdeas[promptIdeaIndex])}
                    className="mt-2 inline-flex w-full items-center gap-2 text-left text-xs leading-5 text-mist transition hover:text-cyberBlue sm:w-auto"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-cyberBlue shadow-blue-glow" />
                    Use suggested prompt
                  </button>
                ) : null}

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mist">AI presets</p>
                    <AnimatePresence mode="wait">
                      {activePreset ? (
                        <motion.span
                          key={activePreset}
                          initial={{ opacity: 0, x: 4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          className="text-[0.68rem] font-medium text-cyberBlue"
                        >
                          {presets.find((preset) => preset.name === activePreset)?.tone} tone suggested
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>
                  <div className="hide-scrollbar -mx-1 mt-3 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 pr-8 [scroll-padding-inline:0.75rem]" aria-label="Creative direction presets">
                    {presets.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        aria-pressed={activePreset === preset.name}
                        className={`preset-chip relative isolate shrink-0 whitespace-nowrap overflow-hidden rounded-full px-3.5 py-2 text-xs font-medium transition ${
                          activePreset === preset.name ? "preset-chip-active text-frost" : "text-mist hover:text-frost"
                        }`}
                      >
                        {activePreset === preset.name ? (
                          <motion.span
                            layoutId="active-preset-chip"
                            className="absolute inset-0 -z-10 bg-gradient-to-r from-violetGlow/20 to-cyberBlue/16"
                            transition={{ type: "spring", stiffness: 340, damping: 30 }}
                          />
                        ) : null}
                        {preset.name}
                      </button>
                    ))}
                    <span className="w-2 shrink-0" aria-hidden="true" />
                  </div>
                </div>

                <div className="mt-5 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
                  <WorkspaceSelect label="Niche" value={niche} options={supportedNiches} onChange={setNiche} />
                  <WorkspaceSelect label="Language" value={language} options={supportedLanguages} onChange={setLanguage} />
                  <WorkspaceSelect label="Duration" value={duration} options={supportedDurations} onChange={setDuration} />
                  <WorkspaceSelect label="Tone" value={tone} options={supportedTones} onChange={setTone} />
                </div>

                <button
                  type="submit"
                  disabled={!prompt.trim() || isGenerating || Boolean(userId && usageStatus === "ready" && usage.credits < packageCreditCost())}
                  className="cta-pulse sticky bottom-3 z-10 mt-6 inline-flex min-h-[3.25rem] w-full items-center justify-center overflow-hidden rounded-full bg-frost px-5 text-sm font-semibold text-ink shadow-[0_0_34px_rgba(168,85,247,0.42),0_0_70px_rgba(56,189,248,0.16)] transition hover:-translate-y-0.5 hover:shadow-blue-glow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:static"
                >
                  {isGenerating ? (
                    <span className="inline-flex items-center gap-2">
                      {generationStatusMessage ?? "Generating"}
                      <TypingDots />
                    </span>
                  ) : userId && usageStatus === "ready" && usage.credits < packageCreditCost() ? (
                    "Not enough credits"
                  ) : (
                    "Generate reel package"
                  )}
                </button>
                {userId && usageStatus === "ready" && usage.credits < packageCreditCost() ? (
                  <div className="mt-3 rounded-2xl border border-[#FBBF24]/25 bg-[#FBBF24]/10 p-3 text-xs leading-5 text-[#FDE68A]">
                    Storyboard and Production Pack generation needs {packageCreditCost()} credits. You can still reopen projects and export packages.
                  </div>
                ) : null}
                {userId && usageStatus === "unavailable" ? (
                  <div className="mt-3 rounded-2xl border border-cyberBlue/25 bg-cyberBlue/10 p-3 text-xs leading-5 text-cyberBlue">
                    Usage unavailable. Credits are not synced right now, but generation is still enabled.
                  </div>
                ) : null}
                <AnimatePresence>
                  {errorMessage ? (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="mt-4 rounded-2xl border border-[#FB7185]/25 bg-[#FB7185]/10 p-3 text-sm leading-6 text-[#FDA4AF]"
                    >
                      <p>{errorMessage}</p>
                      <button
                        type="submit"
                        className="mt-3 inline-flex min-h-9 items-center rounded-full border border-[#FB7185]/35 bg-[#FB7185]/10 px-4 text-xs font-medium text-frost transition hover:border-[#FDA4AF]/50 hover:bg-[#FB7185]/15"
                      >
                        Try again
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </form>

              <div className="w-full min-w-0 max-w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:rounded-3xl sm:p-5">
                <div className="flex flex-col gap-4 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">AI output</p>
                    {project && userId && !project.id.startsWith("pending-") ? (
                      editingTitleProjectId === project.id ? (
                        <label className="mt-3 block">
                          <span className="sr-only">Project title</span>
                          <input
                            type="text"
                            value={project.title}
                            maxLength={120}
                            autoFocus
                            onChange={(event) => updateProjectTitle(event.target.value)}
                            onBlur={finishProjectTitleEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                event.currentTarget.blur();
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelProjectTitleEdit();
                              }
                            }}
                            placeholder="New reel concept"
                            className="workspace-title-input w-full max-w-full rounded-lg border border-cyberBlue/30 bg-cyberBlue/[0.04] px-2 py-1.5 text-base font-semibold text-frost outline-none transition focus:border-cyberBlue/50 sm:max-w-md sm:text-lg"
                          />
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingTitleProjectId(project.id)}
                          className="mt-3 block max-w-full rounded-lg border border-transparent px-2 py-1 text-left text-base font-semibold leading-6 text-frost transition hover:border-white/10 hover:bg-white/[0.03] focus:border-cyberBlue/30 focus:bg-cyberBlue/[0.04] focus:outline-none sm:max-w-md sm:text-lg"
                          title="Click to rename project"
                        >
                          <span className="line-clamp-2 break-words">{project.title.trim() || "New reel concept"}</span>
                        </button>
                      )
                    ) : null}
                    <p className="mt-2 text-sm text-mist">
                      {isGenerating
                        ? `Generating ${tabs.find((tab) => tab.key === streamingTab)?.label ?? "content"}`
                        : project
                          ? `${project.tone} / ${project.duration}`
                          : "Waiting for your prompt"}
                    </p>
                    {project ? (
                      <div className="mt-3 flex min-w-0 flex-wrap gap-2">
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-mist">
                          {project.category}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-mist">
                          {project.generationModel}
                        </span>
                        <span className="rounded-full border border-violetGlow/20 bg-violetGlow/[0.08] px-2.5 py-1 text-[11px] capitalize text-violetGlow">
                          {project.status}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {project && !isGenerating ? (
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                      {userId && saveState?.projectId === project.id && saveState.status === "saving" ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-3 py-1 text-xs text-cyberBlue">
                          <span className="h-3 w-3 animate-spin rounded-full border border-cyberBlue/30 border-t-cyberBlue" />
                          Saving...
                        </span>
                      ) : null}
                      {userId && saveState?.projectId === project.id && saveState.status === "saved" ? (
                        <span className="rounded-full border border-[#34D399]/25 bg-[#34D399]/10 px-3 py-1 text-xs text-[#6EE7B7]">
                          Saved
                        </span>
                      ) : null}
                      {userId && saveState?.projectId === project.id && saveState.status === "error" ? (
                        <span className="rounded-full border border-[#FB7185]/25 bg-[#FB7185]/10 px-3 py-1 text-xs text-[#FDA4AF]">
                          Failed to save
                        </span>
                      ) : null}
                      <ExportMenu
                        pack={{
                          ...project,
                          voiceAsset: activeVoiceAsset,
                          videoAsset: activeVideoAsset,
                          workspace: creatorWorkspaceExport,
                          publishing: publishingExportData,
                          autoPilot: autoPilotExportData,
                          learningEngine: learningEngineExportData,
                          trendIntelligence: trendIntelligenceExportData,
                        }}
                        onNotify={showToast}
                        onExport={recordExport}
                      />
                    </div>
                  ) : null}
                </div>

                <OutputPanel
                  project={project}
                  previewOutputs={streamedOutputs}
                  activeTab={activeTab}
                  copiedTab={copiedTab}
                  isGenerating={isGenerating}
                  streamingTab={streamingTab}
                  completedTabs={completedTabs}
                  onCopy={copyOutput}
                  onStartCreating={() => promptRef.current?.focus()}
                  onTabChange={setActiveTab}
                  videoStudioContent={
                    project ? (
                      <VideoStudioPanel
                        asset={activeVideoAsset}
                        assets={activeVideoAssets}
                        isGenerating={isVideoGenerating}
                        canGenerate={Boolean(userId && !project.id.startsWith("pending-") && project.outputs.productionPack.trim())}
                        provider={videoProvider}
                        resolution={videoResolution}
                        aspectRatio={videoAspectRatio}
                        duration={videoDuration}
                        quality={videoQuality}
                        manualThumbnailUrl={manualVideoThumbnailUrl}
                        onProviderChange={setVideoProvider}
                        onResolutionChange={setVideoResolution}
                        onAspectRatioChange={setVideoAspectRatio}
                        onDurationChange={setVideoDuration}
                        onQualityChange={setVideoQuality}
                        onManualThumbnailUrlChange={setManualVideoThumbnailUrl}
                        onGenerate={(variation) => void generateVideoAsset(project, variation)}
                        onLoadAsset={setVideoAsset}
                        onNotify={showToast}
                      />
                    ) : null
                  }
                  creatorWorkspaceContent={
                    <CreatorWorkspacePanel
                      project={project}
                      history={history}
                      voiceAsset={activeVoiceAsset}
                      videoAssets={activeVideoAssets}
                      thumbnailCount={activeThumbnailAssets.length}
                      usage={usage}
                    />
                  }
                  publishingStudioContent={
                    <PublishingStudioPanel
                      userId={userId}
                      project={project}
                      thumbnailAssets={activeThumbnailAssets}
                      videoAssets={activeVideoAssets}
                      onNotify={showToast}
                      onPublishingChange={setPublishingExport}
                    />
                  }
                  autoPilotContent={
                    <AutoPilotAgentPanel
                      userId={userId}
                      project={project}
                      voiceAsset={activeVoiceAsset}
                      videoAssets={activeVideoAssets}
                      thumbnailCount={activeThumbnailAssets.length}
                      onNotify={showToast}
                    />
                  }
                  learningEngineContent={
                    <CreatorLearningEnginePanel
                      userId={userId}
                      project={project}
                      history={history}
                      thumbnailCount={activeThumbnailAssets.length}
                      onNotify={showToast}
                    />
                  }
                  agentControlContent={
                    <AgentControlCenterPanel
                      userId={userId}
                      project={project}
                      onNotify={showToast}
                    />
                  }
                  trendIntelligenceContent={<TrendIntelligencePanel />}
                  autonomousFactoryContent={
                    <AutonomousFactoryPanel
                      userId={userId}
                      project={project}
                      onNotify={showToast}
                    />
                  }
                  memoryVaultContent={<CreatorMemoryVaultPanel project={project} />}
                  toolHubContent={<AgentToolHubPanel onNotify={showToast} />}
                />
                {project ? (
                  <>
                    {activeTab === "voiceover" ? (
                      <VoiceAssetPanel
                        asset={activeVoiceAsset}
                        isGenerating={isVoiceGenerating}
                        canGenerate={Boolean(userId && !project.id.startsWith("pending-") && project.outputs.voiceover.trim())}
                        voiceStyle={voiceStyle}
                        language={voiceLanguage}
                        emotion={voiceEmotion}
                        pacing={voicePacing}
                        onVoiceStyleChange={setVoiceStyle}
                        onLanguageChange={setVoiceLanguage}
                        onEmotionChange={setVoiceEmotion}
                        onPacingChange={setVoicePacing}
                        onGenerate={(variation) => void generateVoiceAsset(project, variation)}
                        onNotify={showToast}
                      />
                    ) : null}
                    <ThumbnailPreviewCard
                      imageUrl={project.thumbnailUrl}
                      fallbackPrompt={project.outputs.thumbnailPrompt}
                      errorMessage={
                        thumbnailFailure?.projectId === project.id ? thumbnailFailure.message : null
                      }
                      isQuotaReached={
                        thumbnailFailure?.projectId === project.id && thumbnailFailure.quotaReached
                      }
                      isGenerating={isThumbnailGenerating}
                      cooldownSeconds={thumbnailCooldownSeconds}
                      mode={thumbnailMode}
                      onModeChange={setThumbnailMode}
                      provider={project.imageProvider}
                      generationTimeMs={project.generationTimeMs}
                      generationState={thumbnailGenerationState}
                      assets={activeThumbnailAssets}
                      quotaUsedToday={usage.thumbnailGenerationsToday}
                      quotaLimit={dailyThumbnailLimit}
                      canGenerate={Boolean(userId && !project.id.startsWith("pending-"))}
                      onGenerate={() => void generateThumbnail(project, Boolean(project.thumbnailUrl))}
                      onGenerateVariation={() => void generateThumbnail(project, true, true)}
                      onNotify={showToast}
                    />
                    {userId ? (
                      <GenerationTimeline
                        history={generationTimeline}
                        currentProject={project}
                        hasError={timelineLoadError}
                        onRestore={(historyEntry) => {
                          if (historyEntry.snapshot) {
                            loadProject(fromProjectRow(historyEntry.snapshot));
                          }
                        }}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </section>
      <AnimatePresence>
        {isHistoryOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close project history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryOpen(false)}
              className="fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 36 }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              className="history-drawer fixed inset-x-3 bottom-3 z-[70] max-h-[85dvh] overflow-hidden rounded-[1.4rem] p-4 pb-5 lg:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Project library</p>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-mist"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[calc(85dvh-3.75rem)] overflow-y-auto overscroll-contain pb-16 pr-1">
                <HistoryPanel
                  activeProjectId={project?.id}
                  history={history}
                  visibleHistory={visibleHistory}
                  isLoading={isHistoryLoading}
                  hasError={historyLoadError}
                  canPersist={Boolean(userId)}
                  deletingProjectIds={deletingProjectIds}
                  query={historyQuery}
                  sort={historySort}
                  onDelete={setProjectPendingDelete}
                  onLoad={loadProject}
                  onQueryChange={setHistoryQuery}
                  onSortChange={setHistorySort}
                />
                {userId ? <ActivitySidebar activity={activityLogs} usage={usage} hasError={activityLoadError} /> : null}
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
      <DeleteProjectModal
        project={projectPendingDelete}
        isDeleting={Boolean(projectPendingDelete && deletingProjectIds.includes(projectPendingDelete.id))}
        onCancel={() => setProjectPendingDelete(null)}
        onConfirm={(id) => void deleteProject(id)}
      />
    </>
  );
}

type HistoryPanelProps = {
  activeProjectId?: string;
  history: Project[];
  visibleHistory: Project[];
  isLoading: boolean;
  hasError: boolean;
  canPersist: boolean;
  deletingProjectIds: string[];
  query: string;
  sort: "recent" | "oldest";
  onDelete: (project: Project) => void;
  onLoad: (project: Project) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (value: "recent" | "oldest") => void;
};

function HistoryPanel({
  activeProjectId,
  history,
  visibleHistory,
  isLoading,
  hasError,
  canPersist,
  deletingProjectIds,
  query,
  sort,
  onDelete,
  onLoad,
  onQueryChange,
  onSortChange,
}: HistoryPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Recent projects</p>
        {canPersist ? (
          <span className="rounded-full border border-[#34D399]/20 bg-[#34D399]/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#6EE7B7]">
            Cloud
          </span>
        ) : null}
      </div>

      <label className="mt-4 block">
        <span className="sr-only">Search projects</span>
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search projects..."
          className="workspace-input h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-frost outline-none transition placeholder:text-mist/55 focus:border-cyberBlue/40"
        />
      </label>

      <div className="mt-3 flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {(["recent", "oldest"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSortChange(option)}
            className={`flex-1 rounded-lg px-2 py-2 text-xs font-medium capitalize transition ${
              sort === option ? "bg-cyberBlue/12 text-cyberBlue shadow-[0_0_18px_rgba(56,189,248,0.1)]" : "text-mist hover:text-frost"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <motion.div layout className="mt-4 space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {isLoading ? (
            <motion.div
              key="loading-history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
              aria-label="Loading saved projects"
            >
              {[0, 1, 2].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="stream-skeleton h-3.5 w-5/6 rounded-full" />
                  <div className="stream-skeleton mt-2.5 h-3.5 w-1/2 rounded-full" />
                  <div className="stream-skeleton mt-4 h-3 w-2/3 rounded-full" />
                </div>
              ))}
            </motion.div>
          ) : hasError ? (
            <motion.div
              key="history-error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-[#FB7185]/20 bg-[#FB7185]/[0.07] p-4 text-sm leading-6 text-[#FDA4AF]"
            >
              Unable to load saved projects.
            </motion.div>
          ) : visibleHistory.length === 0 ? (
            <motion.div
              key="empty-history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-mist"
            >
              {history.length === 0
                ? canPersist
                  ? "No saved projects yet. Generate a reel package to start your library."
                  : "Sign in to save projects and reopen them across sessions."
                : "No projects match your search."}
            </motion.div>
          ) : (
            visibleHistory.map((savedProject) => (
              <motion.article
                layout
                key={savedProject.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className={`history-project group rounded-2xl border p-3.5 transition ${
                  activeProjectId === savedProject.id
                    ? "history-project-active border-cyberBlue/35 bg-cyberBlue/[0.08]"
                    : "border-white/10 bg-white/[0.04] hover:border-cyberBlue/25 hover:bg-cyberBlue/[0.05]"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => onLoad(savedProject)} className="min-w-0 flex-1 text-left">
                    <p className="line-clamp-2 text-sm font-medium leading-5 text-frost">
                      {savedProject.title.trim() || "New reel concept"}
                    </p>
                  </button>
                  {canPersist && !savedProject.id.startsWith("pending-") ? (
                    <button
                      type="button"
                      disabled={deletingProjectIds.includes(savedProject.id)}
                      onClick={() => onDelete(savedProject)}
                      aria-label="Delete project"
                      className="history-icon opacity-70 text-mist transition hover:text-[#FDA4AF] group-hover:opacity-100 disabled:cursor-wait disabled:opacity-35"
                    >
                      {deletingProjectIds.includes(savedProject.id) ? (
                        <span className="block h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                      ) : (
                        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.7]">
                          <path d="M4 7h16M10 11v6m4-6v6M9 7V4h6v3m-9 0 1 13h10l1-13" />
                        </svg>
                      )}
                    </button>
                  ) : null}
                </div>
                <button type="button" onClick={() => onLoad(savedProject)} className="mt-3 flex w-full items-center justify-between text-left text-xs text-mist">
                  <span>{savedProject.niche}</span>
                  <span>{savedProject.id.startsWith("pending-") ? "Saving..." : formatCreatedAt(savedProject.createdAt)}</span>
                </button>
              </motion.article>
            ))
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ActivitySidebar({ activity, usage, hasError }: { activity: ActivityLogRow[]; usage: UsageSummary; hasError: boolean }) {
  const tierLabel = usage.subscriptionTier === "agency" ? "Agency Plan" : usage.subscriptionTier === "creator" ? "Creator Plan" : usage.subscriptionTier === "pro" ? "Pro Plan" : "Free Plan";
  const planLimit = planCreditLimit(usage.subscriptionTier);
  const usedPercent = Math.min(100, Math.round((usage.creditsUsed / Math.max(planLimit, 1)) * 100));

  return (
    <div className="mt-5 border-t border-white/10 pt-5 lg:mt-7 lg:pt-6">
      <div className="rounded-2xl border border-cyberBlue/20 bg-cyberBlue/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Credits</p>
            <p className="mt-2 text-3xl font-semibold text-frost">{usage.credits}</p>
            <p className="mt-1 text-xs text-mist">remaining of {planLimit}</p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${
            usage.subscriptionTier === "pro"
              ? "border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FDE68A]"
              : "border-white/10 bg-white/[0.04] text-mist"
          }`}>
            {tierLabel}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-lg font-semibold text-frost">{usage.generationsCount}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist">Total generations</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-lg font-semibold text-frost">{usage.creditsUsed}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist">Credits used</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-mist">
            <span>Usage progress</span>
            <span>{usedPercent}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-cyberBlue shadow-blue-glow" style={{ width: `${usedPercent}%` }} />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="text-lg font-semibold text-frost">{usage.generationsThisMonth}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist">This month</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
            <p className="truncate text-sm font-semibold capitalize text-frost">{usage.mostUsedTool.replaceAll("_", " ")}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist">Most used tool</p>
          </div>
        </div>
        <a href="/usage-history" className="mt-3 inline-flex text-xs font-medium text-cyberBlue transition hover:text-frost">
          View usage history
        </a>
        <a href="/billing" className="ml-4 mt-3 inline-flex text-xs font-medium text-[#FDE68A] transition hover:text-frost">
          Upgrade
        </a>
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Usage pulse</p>
      <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-4">
        {[
          { label: "Credits", value: usage.credits },
          { label: "Used", value: usage.creditsUsed },
          { label: "Projects", value: usage.totalProjects },
          { label: "Today", value: usage.generationsToday },
          { label: "Month", value: usage.generationsThisMonth },
          { label: "All gens", value: usage.generationsCount },
          { label: "Images", value: usage.imageGenerations },
          { label: "Videos", value: usage.videoGenerations },
          { label: "Video cr.", value: usage.videoCreditsUsed },
          { label: "Exports", value: usage.exportCount },
        ].map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5">
            <p className="text-lg font-semibold text-frost">{metric.value}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-mist">{metric.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue lg:mt-6">Activity</p>
      <div className="mt-3 max-h-[28dvh] space-y-2.5 overflow-y-auto overscroll-contain pr-1 lg:mt-4 lg:max-h-none lg:space-y-3 lg:overflow-visible lg:pr-0">
        {hasError ? (
          <p className="rounded-xl border border-[#FB7185]/20 bg-[#FB7185]/[0.07] p-3 text-xs leading-5 text-[#FDA4AF]">
            Unable to load activity.
          </p>
        ) : activity.length ? (
          activity.map((entry) => (
            <div key={entry.id} className="relative border-l border-cyberBlue/20 pl-4 text-xs">
              <span className="absolute -left-[4px] top-1.5 h-2 w-2 rounded-full bg-cyberBlue shadow-blue-glow" />
              <p className="text-frost">{entry.detail ?? entry.action}</p>
              <p className="mt-1 text-mist">{timeAgo(entry.created_at)}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs leading-5 text-mist">
            Generation, image, video, and export events will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

type GenerationTimelineProps = {
  history: GenerationHistoryRow[];
  currentProject: Project;
  hasError: boolean;
  onRestore: (entry: GenerationHistoryRow) => void;
};

function GenerationTimeline({ history, currentProject, hasError, onRestore }: GenerationTimelineProps) {
  return (
    <section className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:mt-5 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Generation history</p>
          <p className="mt-2 text-sm text-mist">Generated {timeAgo(currentProject.createdAt).toLowerCase()}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-mist">
          {history.length} events
        </span>
      </div>
      <div className="mt-5 space-y-2.5">
        {hasError ? (
          <p className="rounded-2xl border border-[#FB7185]/20 bg-[#FB7185]/[0.07] p-4 text-sm leading-6 text-[#FDA4AF]">
            Unable to load generation history.
          </p>
        ) : history.length ? (
          history.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-ink/35 p-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violetGlow shadow-[0_0_13px_rgba(168,85,247,0.7)]" />
                <div>
                  <p className="text-sm font-medium capitalize text-frost">
                    {entry.event_type === "thumbnail" ? "Thumbnail generated" : entry.event_type.replace("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-mist">{timeAgo(entry.created_at)}</p>
                </div>
              </div>
              {entry.snapshot ? (
                <button
                  type="button"
                  onClick={() => onRestore(entry)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-mist transition hover:border-cyberBlue/30 hover:text-frost"
                >
                  Reload version
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-mist">
            This project&apos;s generated versions and thumbnail updates will appear here.
          </p>
        )}
      </div>
    </section>
  );
}

type DeleteProjectModalProps = {
  project: Project | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (id: string) => void;
};

function DeleteProjectModal({ project, isDeleting, onCancel, onConfirm }: DeleteProjectModalProps) {
  return (
    <AnimatePresence>
      {project ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Cancel delete project"
            onClick={onCancel}
            disabled={isDeleting}
            className="absolute inset-0 bg-ink/75 backdrop-blur-md"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel relative w-full max-w-md rounded-3xl border border-white/15 p-5 shadow-[0_32px_100px_rgba(0,0,0,0.55),0_0_42px_rgba(244,63,94,0.08)] sm:p-6"
          >
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#FB7185]/20 bg-[#FB7185]/10 text-[#FDA4AF]">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.7]">
                <path d="M4 7h16M10 11v6m4-6v6M9 7V4h6v3m-9 0 1 13h10l1-13" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#FDA4AF]">Delete project</p>
            <h3 id="delete-project-title" className="mt-3 text-xl font-semibold text-frost">
              Remove this reel package?
            </h3>
            <p className="mt-3 text-sm leading-6 text-mist">
              <span className="font-medium text-frost">{project.title.trim() || "New reel concept"}</span>{" "}
              will be permanently deleted from your saved workspace.
            </p>
            <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={isDeleting}
                onClick={onCancel}
                className="min-h-11 rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-mist transition hover:bg-white/[0.08] hover:text-frost disabled:opacity-55"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => onConfirm(project.id)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#FB7185]/25 bg-[#FB7185]/10 px-5 text-sm font-semibold text-[#FDA4AF] transition hover:border-[#FB7185]/45 hover:bg-[#FB7185]/15 disabled:cursor-wait disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border border-current border-t-transparent" />
                    Deleting...
                  </>
                ) : (
                  "Delete project"
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type SelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

function WorkspaceSelect({ label, value, options, onChange }: SelectProps) {
  return (
    <label className="min-w-0 text-xs font-semibold uppercase tracking-[0.18em] text-mist">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="workspace-input mt-2 min-h-11 w-full max-w-full rounded-xl border border-white/10 bg-[#0D1222] px-3 text-sm font-normal normal-case tracking-normal text-frost outline-none transition focus:border-cyberBlue/45"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex">
      <span className="typing-dot mx-0.5 h-1.5 w-1.5 rounded-full bg-current" />
      <span className="typing-dot mx-0.5 h-1.5 w-1.5 rounded-full bg-current [animation-delay:0.18s]" />
      <span className="typing-dot mx-0.5 h-1.5 w-1.5 rounded-full bg-current [animation-delay:0.36s]" />
    </span>
  );
}

type OutputPanelProps = {
  project: Project | null;
  previewOutputs: GeneratedOutputs | null;
  activeTab: DashboardTab;
  copiedTab: OutputKey | null;
  isGenerating: boolean;
  streamingTab: OutputKey | null;
  completedTabs: OutputKey[];
  onCopy: (tab: OutputKey) => void;
  onStartCreating: () => void;
  onTabChange: (tab: DashboardTab) => void;
  videoStudioContent?: ReactNode;
  creatorWorkspaceContent?: ReactNode;
  publishingStudioContent?: ReactNode;
  autoPilotContent?: ReactNode;
  learningEngineContent?: ReactNode;
  agentControlContent?: ReactNode;
  trendIntelligenceContent?: ReactNode;
  autonomousFactoryContent?: ReactNode;
  memoryVaultContent?: ReactNode;
  toolHubContent?: ReactNode;
};

function OutputPanel({
  project,
  previewOutputs,
  activeTab,
  copiedTab,
  isGenerating,
  streamingTab,
  completedTabs,
  onCopy,
  onStartCreating,
  onTabChange,
  videoStudioContent,
  creatorWorkspaceContent,
  publishingStudioContent,
  autoPilotContent,
  learningEngineContent,
  agentControlContent,
  trendIntelligenceContent,
  autonomousFactoryContent,
  memoryVaultContent,
  toolHubContent,
}: OutputPanelProps) {
  const outputs = project?.outputs ?? previewOutputs;
  const isOutputTab = activeTab !== "videoStudio" && activeTab !== "creatorWorkspace" && activeTab !== "publishingStudio" && activeTab !== "autoPilot" && activeTab !== "learningEngine" && activeTab !== "agentControl" && activeTab !== "trendIntelligence" && activeTab !== "autonomousFactory" && activeTab !== "memoryVault" && activeTab !== "toolHub";
  const content = isOutputTab ? outputs?.[activeTab] ?? "" : "";
  const isStreamingCurrentTab = isOutputTab && isGenerating && streamingTab === activeTab;
  const showSkeleton = isGenerating && !content;
  const activeLabel = tabs.find((tab) => tab.key === activeTab)?.label;

  return (
    <div className="mt-5 w-full min-w-0 max-w-full overflow-hidden">
      <div className="relative -mx-1 max-w-full overflow-hidden">
        <div className="pointer-events-none absolute bottom-3 left-0 top-0 z-10 w-7 bg-gradient-to-r from-[#111827] via-[#111827]/75 to-transparent sm:hidden" />
        <div className="pointer-events-none absolute bottom-3 right-0 top-0 z-10 w-11 bg-gradient-to-l from-[#111827] via-[#111827]/85 to-transparent sm:hidden" />
        <div
          className="hide-scrollbar flex max-w-full snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto scroll-smooth px-7 pb-3 pr-14 [scroll-padding-inline:1rem] sm:px-1 sm:pr-1"
          role="tablist"
          aria-label="Generated content"
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-controls={`output-panel-${tab.key}`}
              onClick={() => onTabChange(tab.key)}
              className={`relative isolate inline-flex min-h-10 shrink-0 snap-start items-center gap-2 overflow-hidden whitespace-nowrap rounded-full border px-3 py-2 text-xs font-medium transition duration-300 sm:px-3.5 ${
                activeTab === tab.key
                  ? "border-cyberBlue/45 text-cyberBlue shadow-[0_0_24px_rgba(56,189,248,0.18)]"
                  : streamingTab === tab.key
                    ? "border-violetGlow/35 bg-violetGlow/10 text-frost shadow-[0_0_20px_rgba(139,92,246,0.16)]"
                  : "border-white/10 bg-white/[0.03] text-mist hover:text-frost"
              }`}
            >
              {activeTab === tab.key ? (
                <motion.span
                  layoutId="active-output-tab"
                  className="absolute inset-0 -z-10 bg-gradient-to-r from-cyberBlue/[0.13] to-violetGlow/[0.1]"
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                />
              ) : null}
              {tab.label}
              {streamingTab === tab.key && isGenerating ? (
                <span className="status-pulse h-1.5 w-1.5 rounded-full bg-cyberBlue" />
              ) : tab.key !== "videoStudio" && tab.key !== "creatorWorkspace" && tab.key !== "publishingStudio" && tab.key !== "autoPilot" && tab.key !== "learningEngine" && tab.key !== "agentControl" && tab.key !== "trendIntelligence" && tab.key !== "autonomousFactory" && tab.key !== "memoryVault" && tab.key !== "toolHub" && completedTabs.includes(tab.key) ? (
                <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
              ) : null}
            </button>
          ))}
          <span className="w-3 shrink-0 sm:hidden" aria-hidden="true" />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${project?.id ?? "stream"}-${activeTab}`}
          id={`output-panel-${activeTab}`}
          role="tabpanel"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="output-stream mt-3 min-h-[20rem] w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6"
        >
          {activeTab === "videoStudio" ? (
            videoStudioContent
          ) : activeTab === "creatorWorkspace" ? (
            creatorWorkspaceContent
          ) : activeTab === "publishingStudio" ? (
            publishingStudioContent
          ) : activeTab === "autoPilot" ? (
            autoPilotContent
          ) : activeTab === "learningEngine" ? (
            learningEngineContent
          ) : activeTab === "agentControl" ? (
            agentControlContent
          ) : activeTab === "trendIntelligence" ? (
            trendIntelligenceContent
          ) : activeTab === "autonomousFactory" ? (
            autonomousFactoryContent
          ) : activeTab === "memoryVault" ? (
            memoryVaultContent
          ) : activeTab === "toolHub" ? (
            toolHubContent
          ) : showSkeleton ? (
            <StreamingSkeleton label={activeLabel ?? "Output"} />
          ) : content ? (
            <>
              <div className="relative z-[1] flex min-w-0 items-center justify-between gap-3">
                <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.2em] text-violetGlow sm:tracking-[0.24em]">
                  {activeLabel}
                </p>
                {!isStreamingCurrentTab ? (
                  <button
                    type="button"
                    onClick={() => onCopy(activeTab)}
                    className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-mist transition hover:border-cyberBlue/30 hover:bg-cyberBlue/10 hover:text-cyberBlue"
                  >
                    {copiedTab === activeTab ? "Copied" : "Copy"}
                  </button>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-3 py-1.5 text-xs text-cyberBlue">
                    Writing <TypingDots />
                  </span>
                )}
              </div>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.03 }}
                className="mt-4 min-w-0 max-w-full overflow-x-auto sm:mt-5"
              >
                <FormattedOutput content={content} outputKey={activeTab} showCursor={isStreamingCurrentTab} />
              </motion.div>
            </>
          ) : (
            <div className="flex min-h-[13.5rem] min-w-0 flex-col items-center justify-center px-1 py-2 text-center sm:min-h-[17rem] sm:py-0">
              <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyberBlue/25 bg-gradient-to-br from-violetGlow/15 to-cyberBlue/10 shadow-blue-glow">
                <span className="absolute inset-2 rounded-xl border border-cyberBlue/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-cyberBlue shadow-[0_0_18px_rgba(56,189,248,0.9)]" />
              </div>
              <p className="text-lg font-medium text-frost">No saved projects yet</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-mist">
                Create your first reel package and it will appear here, ready to reopen and refine.
              </p>
              <button
                type="button"
                onClick={onStartCreating}
                className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-cyberBlue/25 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/45 hover:bg-cyberBlue/15 hover:text-frost sm:mt-6 sm:w-auto"
              >
                Generate first reel
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StreamingSkeleton({ label }: { label: string }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative z-[1]">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.2em] text-violetGlow sm:tracking-[0.24em]">{label}</p>
        <span className="inline-flex shrink-0 items-center gap-2 text-xs text-cyberBlue">
          Generating <TypingDots />
        </span>
      </div>
      <div className="mt-7 space-y-3" aria-label={`${label} is generating`}>
        <div className="stream-skeleton h-4 w-5/6 rounded-full" />
        <div className="stream-skeleton h-4 w-full rounded-full" />
        <div className="stream-skeleton h-4 w-3/4 rounded-full" />
        <div className="stream-skeleton mt-7 h-4 w-2/3 rounded-full" />
      </div>
    </motion.div>
  );
}
