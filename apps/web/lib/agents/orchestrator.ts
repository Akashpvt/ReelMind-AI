import { getAgent, getAllAgents } from "@/lib/agents/registry";
import type { AgentEvent, AgentTask, AgentType } from "@/lib/agents/types";

export const workflowOrder: AgentType[] = [
  "research",
  "script",
  "storyboard",
  "thumbnail",
  "voice",
  "video",
  "publishing",
  "analytics",
  "learning",
];

const dependencies: Record<AgentType, AgentType[]> = {
  research: [],
  script: ["research"],
  storyboard: ["script"],
  thumbnail: ["storyboard"],
  voice: ["storyboard"],
  video: ["thumbnail", "voice"],
  publishing: ["video"],
  analytics: ["publishing"],
  learning: ["analytics"],
};

function now() {
  return new Date().toISOString();
}

export function createWorkflowTasks(input: unknown): AgentTask[] {
  return workflowOrder.map((agentType) => ({
    id: `agent-${agentType}-${crypto.randomUUID()}`,
    agentType,
    status: "queued",
    createdAt: now(),
    updatedAt: now(),
    input,
    output: null,
    dependencies: dependencies[agentType],
  }));
}

function canRun(task: AgentTask, tasks: AgentTask[]) {
  return task.dependencies.every((dependency) =>
    tasks.some((candidate) => candidate.agentType === dependency && candidate.status === "completed"),
  );
}

function dependencyOutput(task: AgentTask, tasks: AgentTask[]) {
  return task.dependencies.reduce<Record<string, unknown>>((outputs, dependency) => {
    const dependencyTask = tasks.find((candidate) => candidate.agentType === dependency);
    if (dependencyTask?.output) {
      outputs[dependency] = dependencyTask.output;
    }
    return outputs;
  }, {});
}

export async function runWorkflow(input: unknown, onEvent?: (event: AgentEvent, tasks: AgentTask[]) => void | Promise<void>) {
  const tasks = createWorkflowTasks(input);
  const events: AgentEvent[] = [];

  const emit = async (task: AgentTask, message: string) => {
    const event = {
      id: crypto.randomUUID(),
      taskId: task.id,
      agentType: task.agentType,
      message,
      createdAt: now(),
    };
    events.push(event);
    await onEvent?.(event, tasks);
  };

  for (const agentType of workflowOrder) {
    const task = tasks.find((candidate) => candidate.agentType === agentType);
    const agent = getAgent(agentType);
    if (!task || !agent) continue;

    if (!canRun(task, tasks)) {
      task.status = "failed";
      task.updatedAt = now();
      await emit(task, `${agent.name} blocked by unmet dependencies.`);
      continue;
    }

    try {
      task.status = "running";
      task.updatedAt = now();
      task.input = {
        originalInput: task.input,
        dependencyOutputs: dependencyOutput(task, tasks),
      };
      await emit(task, `${agent.name} started.`);
      task.output = await agent.execute(task);
      task.status = "completed";
      task.updatedAt = now();
      await emit(task, `${agent.name} completed.`);
    } catch (error) {
      task.status = "failed";
      task.output = { error: error instanceof Error ? error.message : "Agent execution failed." };
      task.updatedAt = now();
      await emit(task, `${agent.name} failed.`);
    }
  }

  return { tasks, events };
}

export function getRegisteredAgentSummaries(taskHistory: AgentTask[] = []) {
  return getAllAgents().map((agent) => ({
    ...agent.definition(),
    status: taskHistory.findLast((task) => task.agentType === agent.type)?.status ?? "idle",
    taskCount: taskHistory.filter((task) => task.agentType === agent.type).length,
  }));
}
