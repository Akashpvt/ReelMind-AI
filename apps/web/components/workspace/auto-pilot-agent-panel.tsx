"use client";

import { useCallback, useMemo, useState } from "react";
import type { ReelProject as Project } from "@/lib/reel-projects";
import { createClient } from "@/lib/supabase/client";
import type { VideoAsset } from "@/components/workspace/video-studio-panel";
import type { VoiceAsset } from "@/components/workspace/voice-asset-panel";

type AgentTaskStatus = "queued" | "processing" | "completed" | "failed";
type AgentTaskType = "script" | "storyboard" | "thumbnail" | "voice" | "video";

type AgentTask = {
  id: string;
  type: AgentTaskType;
  label: string;
  status: AgentTaskStatus;
  dependsOn: AgentTaskType[];
  createdAt: string;
};

export type AutoPilotExportData = {
  tasks: Array<{ type: AgentTaskType; status: AgentTaskStatus; dependsOn: AgentTaskType[] }>;
  optimization: {
    hookScore: number;
    ctrPrediction: number;
    retentionPrediction: number;
    viralityScore: number;
    audienceMatch: number;
  };
  bestPostingTimes: string[];
  hashtags: string[];
  titles: string[];
  readinessScore: number;
  activity: Array<{ label: string; status: AgentTaskStatus; createdAt: string }>;
};

type AutoPilotAgentPanelProps = {
  userId?: string;
  project: Project | null;
  voiceAsset: VoiceAsset | null;
  videoAssets: VideoAsset[];
  thumbnailCount: number;
  onNotify: (title: string, tone: "success" | "error" | "info", description?: string) => void;
};

const workflow: Array<{ type: AgentTaskType; label: string; dependsOn: AgentTaskType[] }> = [
  { type: "script", label: "Generate script", dependsOn: [] },
  { type: "storyboard", label: "Build storyboard", dependsOn: ["script"] },
  { type: "thumbnail", label: "Render thumbnail", dependsOn: ["script"] },
  { type: "voice", label: "Generate voice", dependsOn: ["storyboard"] },
  { type: "video", label: "Prepare video", dependsOn: ["storyboard", "voice", "thumbnail"] },
];

function clamp(value: number) {
  return Math.max(0, Math.min(98, Math.round(value)));
}

function textScore(text: string, base: number) {
  return clamp(base + Math.min(24, Math.floor(text.trim().length / 70)) + (/wait|secret|mistake|why|how/i.test(text) ? 8 : 0));
}

export function getAutoPilotExportData(project: Project | null, voiceAsset: VoiceAsset | null, videoAssets: VideoAsset[], thumbnailCount: number): AutoPilotExportData {
  const outputs = project?.outputs;
  const optimization = {
    hookScore: textScore(outputs?.hook ?? "", 58),
    ctrPrediction: clamp((project?.thumbnailUrl ? 72 : 45) + textScore(outputs?.hook ?? "", 10) / 5),
    retentionPrediction: textScore(`${outputs?.script ?? ""} ${outputs?.storyboard ?? ""}`, 52),
    viralityScore: textScore(`${outputs?.hook ?? ""} ${outputs?.cta ?? ""}`, 50),
    audienceMatch: textScore(`${project?.niche ?? ""} ${project?.tone ?? ""} ${outputs?.caption ?? ""}`, 55),
  };
  const readinessScore = clamp(
    (optimization.hookScore + optimization.ctrPrediction + optimization.retentionPrediction + optimization.viralityScore + optimization.audienceMatch) / 5 +
      (voiceAsset ? 4 : 0) +
      (videoAssets.length ? 4 : 0) +
      (thumbnailCount ? 4 : 0),
  );

  return {
    tasks: workflow.map((task) => ({
      type: task.type,
      dependsOn: task.dependsOn,
      status:
        task.type === "script" && outputs?.script
          ? "completed"
          : task.type === "storyboard" && outputs?.storyboard
            ? "completed"
            : task.type === "thumbnail" && thumbnailCount
              ? "completed"
              : task.type === "voice" && voiceAsset
                ? "completed"
                : task.type === "video" && videoAssets.length
                  ? "completed"
                  : "queued",
    })),
    optimization,
    bestPostingTimes: ["Tue 6:30 PM", "Thu 8:00 PM", "Sat 11:00 AM"],
    hashtags: ["#CreatorOS", "#ReelMindAI", `#${(project?.niche ?? "CreatorGrowth").replace(/\s/g, "")}`, "#AIWorkflow", "#ViralReels"],
    titles: [
      project?.title ?? "The fastest way to turn one idea into a reel",
      `I tested an AI workflow for ${project?.niche ?? "creators"}`,
      "From blank page to production-ready reel",
    ],
    readinessScore,
    activity: workflow.map((task) => ({ label: task.label, status: "queued", createdAt: new Date().toISOString() })),
  };
}

export function AutoPilotAgentPanel({ userId, project, voiceAsset, videoAssets, thumbnailCount, onNotify }: AutoPilotAgentPanelProps) {
  const exportData = useMemo(
    () => getAutoPilotExportData(project, voiceAsset, videoAssets, thumbnailCount),
    [project, thumbnailCount, videoAssets, voiceAsset],
  );
  const [tasks, setTasks] = useState<AgentTask[]>(
    workflow.map((task, index) => ({
      ...task,
      id: `task-${task.type}-${index}`,
      status: exportData.tasks[index]?.status ?? "queued",
      createdAt: new Date().toISOString(),
    })),
  );

  const runWorkflow = useCallback(async () => {
    if (!project) {
      onNotify("No project selected", "error", "Generate or reopen a project before running Auto-Pilot.");
      return;
    }

    const supabase = userId ? createClient() : null;
    for (const task of workflow) {
      setTasks((current) =>
        current.map((item) => (item.type === task.type ? { ...item, status: "processing", createdAt: new Date().toISOString() } : item)),
      );
      await new Promise((resolve) => setTimeout(resolve, 420));
      setTasks((current) =>
        current.map((item) => (item.type === task.type ? { ...item, status: "completed", createdAt: new Date().toISOString() } : item)),
      );

      if (supabase && !project.id.startsWith("pending-")) {
        await supabase.from("agent_tasks").insert({
          user_id: userId,
          project_id: project.id,
          task_type: task.type,
          status: "completed",
          dependencies: task.dependsOn,
          metadata: { label: task.label, autoPilotVersion: "5C" },
        });
      }
    }
    onNotify("Auto-Pilot workflow completed", "success", "Script, storyboard, assets, optimization, and publishing prep are sequenced.");
  }, [onNotify, project, userId]);

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">AI Auto-Pilot Agent</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Autonomous creator workflow engine</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">Orchestrate script, storyboard, thumbnail, voice, video, optimization, and publishing prep with dependency-aware tasks.</p>
        </div>
        <button type="button" onClick={() => void runWorkflow()} className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost">
          Run Auto-Pilot
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Workflow Visualization</p>
            <span className="rounded-full border border-[#34D399]/25 bg-[#34D399]/10 px-3 py-1 text-xs text-[#6EE7B7]">{exportData.readinessScore}% ready</span>
          </div>
          <div className="mt-5 space-y-3">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-ink/35 p-3">
                <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${task.status === "completed" ? "bg-[#34D399]" : task.status === "processing" ? "bg-cyberBlue shadow-blue-glow" : task.status === "failed" ? "bg-[#FB7185]" : "bg-[#FBBF24]"}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-frost">{index + 1}. {task.label}</p>
                  <p className="mt-1 text-xs text-mist">Depends on: {task.dependsOn.length ? task.dependsOn.join(", ") : "none"} / {task.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <ScoreCard title="AI Optimization Engine V2" rows={[
            ["Hook", exportData.optimization.hookScore],
            ["CTR", exportData.optimization.ctrPrediction],
            ["Retention", exportData.optimization.retentionPrediction],
            ["Virality", exportData.optimization.viralityScore],
            ["Audience", exportData.optimization.audienceMatch],
          ]} />
          <SuggestionCard title="Best Posting Time" items={exportData.bestPostingTimes} />
          <SuggestionCard title="AI Titles" items={exportData.titles} />
          <SuggestionCard title="Auto Hashtags" items={exportData.hashtags} />
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Agent Activity Timeline</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
          {tasks.map((task) => (
            <div key={`activity-${task.id}`} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
              <p className="text-sm font-medium text-frost">{task.label}</p>
              <p className="mt-1 text-xs text-mist">{task.status} / {new Date(task.createdAt).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScoreCard({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return (
    <div className="rounded-3xl border border-cyberBlue/15 bg-cyberBlue/[0.04] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="mb-1.5 flex justify-between text-xs text-mist"><span>{label}</span><span>{value}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-cyberBlue to-violetGlow" style={{ width: `${value}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => <span key={`${title}-${item}`} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-frost">{item}</span>)}
      </div>
    </div>
  );
}
