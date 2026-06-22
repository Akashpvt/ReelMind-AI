"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  autonomousFactoryOrder,
  type FactoryAgent,
  type FactoryAgentTask,
  type WorkflowLog,
  type WorkflowRun,
} from "@/lib/agents";
import { runFactoryWorkflow } from "@/lib/factory/factory-orchestrator";
import type { FactoryWorkflowMetadata, FactoryWorkflowSnapshot } from "@/lib/factory/factory-types";
import type { ReelProject as Project } from "@/lib/reel-projects";
import { createClient } from "@/lib/supabase/client";

type AutonomousFactoryPanelProps = {
  userId?: string;
  project: Project | null;
  onNotify: (title: string, tone: "success" | "error" | "info", description?: string) => void;
};

const agentLabels: Record<FactoryAgent, string> = {
  research: "Research",
  script: "Script",
  storyboard: "Storyboard",
  thumbnail: "Thumbnail",
  voice: "Voice",
  video: "Video",
  publishing: "Publishing",
};

const statusStyles = {
  queued: "border-[#FBBF24]/20 bg-[#FBBF24]/10 text-[#FDE68A]",
  running: "border-cyberBlue/25 bg-cyberBlue/10 text-cyberBlue",
  paused: "border-violetGlow/25 bg-violetGlow/10 text-violetGlow",
  completed: "border-[#34D399]/25 bg-[#34D399]/10 text-[#6EE7B7]",
  failed: "border-[#FB7185]/25 bg-[#FB7185]/10 text-[#FDA4AF]",
  canceled: "border-white/15 bg-white/[0.05] text-mist",
};

function emptyRun(): WorkflowRun {
  return {
    id: "factory-idle",
    status: "queued",
    startedAt: new Date().toISOString(),
    completedAt: null,
    progress: 0,
    currentAgent: "research",
  };
}

function emptyTasks(): FactoryAgentTask[] {
  return autonomousFactoryOrder.map((agent) => ({
    id: `idle-${agent}`,
    agent,
    input: null,
    output: null,
    status: "queued",
    startedAt: null,
    completedAt: null,
  }));
}

function summarizeOutput(output: unknown) {
  if (!output || typeof output !== "object") return "Factory output will appear here after the workflow runs.";
  const record = output as Record<string, unknown>;
  if (typeof record.summary === "string") return record.summary;
  if (Array.isArray(record.recommendedReelIdeas)) return `${record.recommendedReelIdeas.length} research-backed reel ideas generated.`;
  return "Agent produced structured creator pipeline data.";
}

async function persistSnapshot(userId: string | undefined, project: Project | null, snapshot: FactoryWorkflowSnapshot) {
  if (!userId) return;
  const supabase = createClient();
  const projectId = project?.id && !project.id.startsWith("pending-") ? project.id : null;

  await supabase.from("workflow_runs").upsert({
    id: snapshot.workflowId,
    user_id: userId,
    project_id: projectId,
    status: snapshot.status,
    progress: snapshot.progress,
    current_agent: snapshot.currentStep,
    input: {
      projectId,
      title: project?.title ?? "Untitled creator workflow",
      prompt: project?.prompt ?? "",
      niche: project?.niche ?? "AI",
    },
    output: snapshot.output,
    started_at: snapshot.metadata.startedAt,
    completed_at: snapshot.metadata.completedAt,
    updated_at: new Date().toISOString(),
  });

  await Promise.all(
    snapshot.steps.map((task) =>
      supabase.from("agent_tasks").upsert({
        id: `${snapshot.workflowId}-${task.step}`,
        user_id: userId,
        project_id: projectId,
        workflow_run_id: snapshot.workflowId,
        agent: task.step,
        agent_type: task.step,
        task_type: task.step,
        status: task.status,
        input: { source: "factory_orchestrator" },
        output: task.output,
        started_at: task.startedAt,
        completed_at: task.completedAt,
        updated_at: new Date().toISOString(),
        metadata: { source: "factory_orchestrator", phase: "6.0F.10", latency: task.latency, credits: task.credits, provider: task.provider },
      }),
    ),
  );
}

function emptyMetadata(): FactoryWorkflowMetadata {
  return {
    workflowId: "factory-idle",
    startedAt: new Date().toISOString(),
    completedAt: null,
    totalLatency: 0,
    totalCredits: 0,
    providersUsed: [],
    status: "running",
  };
}

function runFromSnapshot(snapshot: FactoryWorkflowSnapshot): WorkflowRun {
  return {
    id: snapshot.workflowId,
    status: snapshot.status === "completed" ? "completed" : snapshot.status === "failed" ? "failed" : "running",
    startedAt: snapshot.metadata.startedAt,
    completedAt: snapshot.metadata.completedAt,
    progress: snapshot.progress,
    currentAgent: snapshot.currentStep === "complete" ? "publishing" : snapshot.currentStep,
  };
}

function tasksFromSnapshot(snapshot: FactoryWorkflowSnapshot): FactoryAgentTask[] {
  return snapshot.steps.map((step) => ({
    id: `${snapshot.workflowId}-${step.step}`,
    agent: step.step,
    input: null,
    output: step.output,
    status: step.status,
    startedAt: step.startedAt,
    completedAt: step.completedAt,
  }));
}

function logsFromSnapshot(snapshot: FactoryWorkflowSnapshot): WorkflowLog[] {
  return snapshot.logs.map((log) => ({
    id: log.id,
    runId: snapshot.workflowId,
    agent: log.step,
    message: log.message,
    createdAt: log.createdAt,
  }));
}

export function AutonomousFactoryPanel({ userId, project, onNotify }: AutonomousFactoryPanelProps) {
  const [run, setRun] = useState<WorkflowRun>(() => emptyRun());
  const [tasks, setTasks] = useState<FactoryAgentTask[]>(() => emptyTasks());
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [output, setOutput] = useState<Record<string, unknown>>({});
  const [workflowMetadata, setWorkflowMetadata] = useState<FactoryWorkflowMetadata>(() => emptyMetadata());
  const [isExecuting, setIsExecuting] = useState(false);
  const [realtimeCount, setRealtimeCount] = useState(0);
  const activeRunIdRef = useRef<string | null>(null);

  const currentTask = useMemo(
    () => tasks.find((task) => task.agent === run.currentAgent) ?? tasks.find((task) => task.status === "running") ?? null,
    [run.currentAgent, tasks],
  );
  const failedTask = useMemo(() => tasks.find((task) => task.status === "failed") ?? null, [tasks]);
  const estimatedCompletion = useMemo(() => {
    const remaining = tasks.filter((task) => task.status === "queued").length;
    if (run.status === "completed") return "Complete";
    if (run.status === "paused") return "Paused";
    if (!isExecuting && run.progress === 0) return "Ready";
    return `${Math.max(1, remaining * 2)} sec`;
  }, [isExecuting, run.progress, run.status, tasks]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`autonomous-factory-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "workflow_runs", filter: `user_id=eq.${userId}` },
        () => setRealtimeCount((current) => current + 1),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_tasks", filter: `user_id=eq.${userId}` },
        () => setRealtimeCount((current) => current + 1),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleRunWorkflow(retry = false) {
    if (isExecuting) return;
    setIsExecuting(true);
    setLogs([]);
    setOutput({});
    setTasks(emptyTasks());

    try {
      const result = await runFactoryWorkflow(
        {
          topic: `${retry && failedTask ? `Retry ${failedTask.agent}: ` : ""}${project?.prompt || project?.title || "Create a viral creator reel package."}`,
          niche: project?.niche ?? "AI",
          duration: project?.duration === "15s" || project?.duration === "60s" ? project.duration : "30s",
          platform: "Instagram",
        },
        {
          onUpdate: async (nextSnapshot) => {
            activeRunIdRef.current = nextSnapshot.workflowId;
            setRun(runFromSnapshot(nextSnapshot));
            setTasks(tasksFromSnapshot(nextSnapshot));
            setLogs(logsFromSnapshot(nextSnapshot));
            setOutput(nextSnapshot.output);
            setWorkflowMetadata(nextSnapshot.metadata);
            await persistSnapshot(userId, project, nextSnapshot).catch(() => undefined);
          },
        },
      );
      setWorkflowMetadata(result.metadata);
      setOutput({
        research: result.research,
        script: result.script,
        storyboard: result.storyboard,
        thumbnail: result.thumbnail,
        voice: result.voice,
        video: result.video,
        publishing: result.publishing,
      });
      onNotify(
        result.metadata.status === "completed" ? "Factory workflow completed" : "Factory workflow stopped",
        result.metadata.status === "completed" ? "success" : "info",
        `Completed ${result.summary.completedSteps.length} steps with ${result.summary.creditsUsed} credits tracked.`,
      );
    } catch {
      onNotify("Factory workflow failed", "error", "The autonomous execution pipeline could not complete.");
    } finally {
      setIsExecuting(false);
    }
  }

  function handlePause() {
    const runId = activeRunIdRef.current;
    if (!runId) return;
    setRun((current) => ({ ...current, status: "paused" }));
  }

  function handleResume() {
    const runId = activeRunIdRef.current;
    if (!runId) return;
    setRun((current) => ({ ...current, status: "running" }));
  }

  function handleCancel() {
    const runId = activeRunIdRef.current;
    if (!runId) return;
    setRun((current) => ({ ...current, status: "canceled" }));
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Autonomous Factory</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">One-click creator pipeline execution</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">
            Connect research, scripting, storyboard, thumbnail, voice, video, and publishing agents into one autonomous content factory.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => void handleRunWorkflow(false)} disabled={isExecuting} className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost disabled:cursor-wait disabled:opacity-60">
            {isExecuting ? "Running..." : "Run Workflow"}
          </button>
          <button type="button" onClick={run.status === "paused" ? handleResume : handlePause} disabled={!isExecuting} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-mist transition hover:border-violetGlow/35 hover:text-frost disabled:opacity-45">
            {run.status === "paused" ? "Resume" : "Pause"}
          </button>
          <button type="button" onClick={handleCancel} disabled={!isExecuting} className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 text-sm font-medium text-mist transition hover:border-[#FB7185]/35 hover:text-[#FDA4AF] disabled:opacity-45">
            Cancel
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-cyberBlue/15 bg-cyberBlue/[0.04] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Workflow Status</p>
              <span className={`rounded-full border px-3 py-1 text-xs capitalize ${statusStyles[run.status]}`}>{run.status}</span>
            </div>
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-mist">
                <span>Progress</span>
                <span>{run.progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-gradient-to-r from-cyberBlue via-violetGlow to-[#34D399] transition-all duration-500" style={{ width: `${run.progress}%` }} />
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Current Agent" value={currentTask ? agentLabels[currentTask.agent] : "Ready"} />
              <MetricCard label="Execution Metadata" value={`${workflowMetadata.totalLatency}ms / ${workflowMetadata.totalCredits} credits`} />
              <MetricCard label="Providers Used" value={workflowMetadata.providersUsed.length ? workflowMetadata.providersUsed.join(", ") : "Pending"} />
              <MetricCard label="Run ID" value={run.id === "factory-idle" ? "Not started" : run.id.slice(0, 8)} />
              <MetricCard label="Estimated Completion" value={`${estimatedCompletion} / ${realtimeCount} live updates`} />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Actions</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void handleRunWorkflow(true)} disabled={!failedTask || isExecuting} className="min-h-10 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-mist transition hover:border-cyberBlue/30 hover:text-cyberBlue disabled:opacity-45">
                Retry Failed Step
              </button>
              <button type="button" onClick={() => setLogs([])} className="min-h-10 rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-medium text-mist transition hover:border-white/20 hover:text-frost">
                Clear Logs
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Agent Timeline</p>
          <div className="mt-4 space-y-2.5">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-ink/35 p-3">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs ${statusStyles[task.status]}`}>{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-frost">{agentLabels[task.agent]} Agent</p>
                  <p className="mt-1 text-xs capitalize text-mist">{task.status} {task.completedAt ? `/ ${new Date(task.completedAt).toLocaleTimeString()}` : ""}</p>
                </div>
                {index < tasks.length - 1 ? <span className="hidden text-cyberBlue/45 md:inline" aria-hidden="true">&rarr;</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Task Logs</p>
          <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
            {logs.length ? logs.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <p className="text-sm text-frost">{item.message}</p>
                <p className="mt-1 text-xs capitalize text-mist">{item.agent} / {new Date(item.createdAt).toLocaleTimeString()}</p>
              </div>
            )) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-mist">Run the workflow to stream live factory logs.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Workflow Output</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {autonomousFactoryOrder.map((agent) => (
              <article key={`factory-output-${agent}`} className="min-w-0 rounded-2xl border border-white/10 bg-ink/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-frost">{agentLabels[agent]}</p>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-mist">{tasks.find((task) => task.agent === agent)?.status ?? "queued"}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-mist">{summarizeOutput(output[agent])}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-ink/35 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-2 truncate text-sm font-medium text-frost" title={value}>{value}</p>
    </div>
  );
}
