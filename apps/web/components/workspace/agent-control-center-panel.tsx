"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getRegisteredAgentSummaries,
  persistAgentLog,
  persistAgentTask,
  runWorkflow,
  workflowOrder,
  type AgentEvent,
  type AgentTask,
} from "@/lib/agents";
import type { ReelProject as Project } from "@/lib/reel-projects";

type AgentControlCenterPanelProps = {
  userId?: string;
  project: Project | null;
  onNotify: (title: string, tone: "success" | "error" | "info", description?: string) => void;
};

export function AgentControlCenterPanel({ userId, project, onNotify }: AgentControlCenterPanelProps) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const agentSummaries = useMemo(() => getRegisteredAgentSummaries(tasks), [tasks]);

  async function handleRunWorkflow() {
    if (isRunning) return;
    setIsRunning(true);
    setTasks([]);
    setEvents([]);

    const supabase = userId ? createClient() : null;
    try {
      const result = await runWorkflow(
        {
          projectId: project?.id ?? null,
          title: project?.title ?? "Untitled creator workflow",
          prompt: project?.prompt ?? "",
        },
        async (event, nextTasks) => {
          setTasks([...nextTasks]);
          setEvents((current) => [event, ...current].slice(0, 24));
          if (supabase && userId) {
            const eventTask = nextTasks.find((task) => task.id === event.taskId);
            if (eventTask) {
              await persistAgentTask(supabase, userId, project?.id ?? null, eventTask);
            }
            await persistAgentLog(supabase, userId, project?.id ?? null, event);
          }
        },
      );
      setTasks(result.tasks);
      setEvents(result.events.slice().reverse());
      onNotify("Workflow completed", "success", "The multi-agent mock workflow ran dependency-aware execution.");
    } catch {
      onNotify("Workflow failed", "error", "Agent orchestration could not complete.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/10 bg-ink/45 p-3.5 sm:mt-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Agent Control Center</p>
          <h3 className="mt-2 text-xl font-semibold text-frost">Multi-agent creator operating system</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mist">Coordinate specialized creator agents with dependency-aware execution, local status tracking, and Supabase-ready task logs.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleRunWorkflow()}
          disabled={isRunning}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyberBlue/30 bg-cyberBlue/10 px-5 text-sm font-medium text-cyberBlue transition hover:border-cyberBlue/50 hover:text-frost disabled:cursor-wait disabled:opacity-60"
        >
          {isRunning ? "Running..." : "Run Workflow"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Registered Agents</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {agentSummaries.map((agent) => (
              <article key={agent.type} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-frost">{agent.name}</p>
                  <span className="rounded-full border border-cyberBlue/20 bg-cyberBlue/10 px-2.5 py-1 text-[10px] text-cyberBlue">{agent.status}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-mist">{agent.description}</p>
                <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-mist">Tasks: {agent.taskCount}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Workflow Visualizer</p>
          <div className="mt-4 space-y-2">
            {workflowOrder.map((agentType, index) => {
              const task = tasks.find((item) => item.agentType === agentType);
              return (
                <div key={agentType}>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink/35 p-3">
                    <span className={`h-3 w-3 rounded-full ${task?.status === "completed" ? "bg-[#34D399]" : task?.status === "running" ? "bg-cyberBlue shadow-blue-glow" : task?.status === "failed" ? "bg-[#FB7185]" : "bg-[#FBBF24]"}`} />
                    <p className="text-sm font-medium capitalize text-frost">{agentType}</p>
                    <span className="ml-auto text-xs text-mist">{task?.status ?? "idle"}</span>
                  </div>
                  {index < workflowOrder.length - 1 ? <div className="ml-4 h-4 w-px bg-cyberBlue/25" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Activity Log</p>
        <div className="mt-4 max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {events.length ? events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/10 bg-ink/35 p-3">
              <p className="text-sm text-frost">{event.message}</p>
              <p className="mt-1 text-xs capitalize text-mist">{event.agentType} / {new Date(event.createdAt).toLocaleTimeString()}</p>
            </div>
          )) : (
            <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-mist">Run the workflow to see agent events stream here.</p>
          )}
        </div>
      </div>
    </section>
  );
}
