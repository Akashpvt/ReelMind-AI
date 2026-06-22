import { getAgent } from "@/lib/agents/registry";
import type { AgentType } from "@/lib/agents/types";

export type FactoryAgent = "research" | "script" | "storyboard" | "thumbnail" | "voice" | "video" | "publishing";
export type WorkflowRunStatus = "queued" | "running" | "paused" | "completed" | "failed" | "canceled";
export type FactoryTaskStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export interface WorkflowRun {
  id: string;
  status: WorkflowRunStatus;
  startedAt: string;
  completedAt: string | null;
  progress: number;
  currentAgent: string;
}

export interface AgentTask {
  id: string;
  agent: FactoryAgent;
  input: unknown;
  output: unknown;
  status: FactoryTaskStatus;
  startedAt: string | null;
  completedAt: string | null;
}

export type WorkflowLog = {
  id: string;
  runId: string;
  agent: FactoryAgent | "workflow";
  message: string;
  createdAt: string;
};

export type WorkflowSnapshot = {
  run: WorkflowRun;
  tasks: AgentTask[];
  logs: WorkflowLog[];
  output: Record<string, unknown>;
};

type WorkflowControl = {
  paused: boolean;
  canceled: boolean;
};

type WorkflowOptions = {
  onUpdate?: (snapshot: WorkflowSnapshot) => void | Promise<void>;
};

export const autonomousFactoryOrder: FactoryAgent[] = [
  "research",
  "script",
  "storyboard",
  "thumbnail",
  "voice",
  "video",
  "publishing",
];

const controls = new Map<string, WorkflowControl>();

function now() {
  return new Date().toISOString();
}

function createRun(): WorkflowRun {
  return {
    id: crypto.randomUUID(),
    status: "queued",
    startedAt: now(),
    completedAt: null,
    progress: 0,
    currentAgent: "research",
  };
}

function createTasks(initialInput: unknown): AgentTask[] {
  return autonomousFactoryOrder.map((agent) => ({
    id: crypto.randomUUID(),
    agent,
    input: agent === "research" ? initialInput : null,
    output: null,
    status: "queued",
    startedAt: null,
    completedAt: null,
  }));
}

function log(runId: string, agent: WorkflowLog["agent"], message: string): WorkflowLog {
  return {
    id: crypto.randomUUID(),
    runId,
    agent,
    message,
    createdAt: now(),
  };
}

function snapshot(run: WorkflowRun, tasks: AgentTask[], logs: WorkflowLog[], output: Record<string, unknown>) {
  return {
    run: { ...run },
    tasks: tasks.map((task) => ({ ...task })),
    logs: logs.map((item) => ({ ...item })),
    output: { ...output },
  };
}

async function waitWhilePaused(runId: string, run: WorkflowRun, tasks: AgentTask[], logs: WorkflowLog[], output: Record<string, unknown>, onUpdate?: WorkflowOptions["onUpdate"]) {
  while (controls.get(runId)?.paused) {
    run.status = "paused";
    await onUpdate?.(snapshot(run, tasks, logs, output));
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

export function registerAgent(agentType: FactoryAgent) {
  return getAgent(agentType);
}

export async function executeAgent(agentType: FactoryAgent, task: AgentTask) {
  const agent = getAgent(agentType as AgentType);
  if (!agent) {
    throw new Error(`${agentType} agent is not registered.`);
  }

  return agent.execute({
    id: task.id,
    agentType,
    status: task.status === "running" ? "running" : "queued",
    createdAt: task.startedAt ?? now(),
    updatedAt: now(),
    input: task.input,
    output: task.output,
    dependencies: [],
  });
}

export async function executeWorkflow(initialInput: unknown, options: WorkflowOptions = {}) {
  const run = createRun();
  const tasks = createTasks(initialInput);
  const logs: WorkflowLog[] = [log(run.id, "workflow", "Autonomous factory workflow queued.")];
  const output: Record<string, unknown> = {};

  controls.set(run.id, { paused: false, canceled: false });
  run.status = "running";
  await options.onUpdate?.(snapshot(run, tasks, logs, output));

  try {
    let chainedInput = initialInput;

    for (const [index, agentType] of autonomousFactoryOrder.entries()) {
      const control = controls.get(run.id);
      const task = tasks[index];
      if (!task) continue;

      if (control?.canceled) {
        run.status = "canceled";
        run.completedAt = now();
        task.status = "canceled";
        task.completedAt = now();
        logs.unshift(log(run.id, agentType, `${agentType} skipped because workflow was canceled.`));
        await options.onUpdate?.(snapshot(run, tasks, logs, output));
        break;
      }

      await waitWhilePaused(run.id, run, tasks, logs, output, options.onUpdate);
      run.status = "running";
      run.currentAgent = agentType;
      task.status = "running";
      task.startedAt = now();
      task.input = chainedInput;
      logs.unshift(log(run.id, agentType, `${agentType} agent started.`));
      await options.onUpdate?.(snapshot(run, tasks, logs, output));

      try {
        const result = await executeAgent(agentType, task);
        task.output = result;
        task.status = "completed";
        task.completedAt = now();
        output[agentType] = result;
        chainedInput = {
          previousAgent: agentType,
          previousOutput: result,
          workflowOutput: { ...output },
          originalInput: initialInput,
        };
        run.progress = Math.round(((index + 1) / autonomousFactoryOrder.length) * 100);
        logs.unshift(log(run.id, agentType, `${agentType} agent completed.`));
        await options.onUpdate?.(snapshot(run, tasks, logs, output));
      } catch (error) {
        task.status = "failed";
        task.output = { error: error instanceof Error ? error.message : "Agent execution failed." };
        task.completedAt = now();
        run.status = "failed";
        run.completedAt = now();
        logs.unshift(log(run.id, agentType, `${agentType} agent failed.`));
        await options.onUpdate?.(snapshot(run, tasks, logs, output));
        return snapshot(run, tasks, logs, output);
      }
    }

    if (!(["canceled", "failed"] as WorkflowRunStatus[]).includes(run.status)) {
      run.status = "completed";
      run.progress = 100;
      run.completedAt = now();
      run.currentAgent = "publishing";
      logs.unshift(log(run.id, "workflow", "Autonomous creator pipeline completed."));
      await options.onUpdate?.(snapshot(run, tasks, logs, output));
    }
  } finally {
    controls.delete(run.id);
  }

  return snapshot(run, tasks, logs, output);
}

export function pauseWorkflow(runId: string) {
  const control = controls.get(runId);
  if (control) control.paused = true;
}

export function resumeWorkflow(runId: string) {
  const control = controls.get(runId);
  if (control) control.paused = false;
}

export function cancelWorkflow(runId: string) {
  const control = controls.get(runId);
  if (control) control.canceled = true;
}
