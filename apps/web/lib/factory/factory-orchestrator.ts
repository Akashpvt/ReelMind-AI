import { getAgent } from "@/lib/agents/registry";
import type { AgentTask } from "@/lib/agents/types";
import type {
  FactoryStepName,
  FactoryStepResult,
  FactorySummary,
  FactoryWorkflowInput,
  FactoryWorkflowMetadata,
  FactoryWorkflowOutput,
  FactoryWorkflowSnapshot,
} from "@/lib/factory/factory-types";

const factorySteps: FactoryStepName[] = ["research", "script", "storyboard", "thumbnail", "voice", "video", "publishing"];

type RunOptions = {
  onUpdate?: (snapshot: FactoryWorkflowSnapshot) => void | Promise<void>;
};

function now() {
  return new Date().toISOString();
}

function initialStep(step: FactoryStepName): FactoryStepResult {
  return {
    step,
    status: "queued",
    startedAt: null,
    completedAt: null,
    latency: 0,
    credits: 0,
    provider: null,
    output: null,
    error: null,
  };
}

function workflowInput(input: FactoryWorkflowInput) {
  return {
    ...input,
    prompt: input.topic,
    title: input.topic,
  };
}

function outputRecord(output: unknown) {
  return typeof output === "object" && output !== null ? output as Record<string, unknown> : {};
}

function metadataFromOutput(output: unknown) {
  const record = outputRecord(output);
  const metadata = outputRecord(record.metadata ?? record.executionMetadata);
  return {
    provider: typeof metadata.provider === "string" ? metadata.provider : null,
    latency: typeof metadata.latency === "number" ? metadata.latency : 0,
    credits: typeof metadata.credits === "number" ? metadata.credits : 0,
  };
}

function summary(steps: FactoryStepResult[], startedAt: string): FactorySummary {
  return {
    completedSteps: steps.filter((step) => step.status === "completed").map((step) => step.step),
    failedSteps: steps.filter((step) => step.status === "failed").map((step) => step.step),
    executionTime: Date.now() - new Date(startedAt).getTime(),
    creditsUsed: steps.reduce((total, step) => total + step.credits, 0),
  };
}

function metadata(workflowId: string, startedAt: string, completedAt: string | null, steps: FactoryStepResult[], status: FactoryWorkflowMetadata["status"]): FactoryWorkflowMetadata {
  return {
    workflowId,
    startedAt,
    completedAt,
    totalLatency: steps.reduce((total, step) => total + step.latency, 0),
    totalCredits: steps.reduce((total, step) => total + step.credits, 0),
    providersUsed: [...new Set(steps.map((step) => step.provider).filter(Boolean) as string[])],
    status,
  };
}

function snapshot(input: {
  workflowId: string;
  startedAt: string;
  completedAt: string | null;
  currentStep: FactoryStepName | "complete";
  steps: FactoryStepResult[];
  output: Partial<Record<FactoryStepName, unknown>>;
  status: FactoryWorkflowMetadata["status"];
  logs: FactoryWorkflowSnapshot["logs"];
}): FactoryWorkflowSnapshot {
  const completeCount = input.steps.filter((step) => step.status === "completed").length;
  const meta = metadata(input.workflowId, input.startedAt, input.completedAt, input.steps, input.status);
  return {
    workflowId: input.workflowId,
    currentStep: input.currentStep,
    progress: Math.round((completeCount / factorySteps.length) * 100),
    status: input.status,
    steps: input.steps.map((step) => ({ ...step })),
    output: { ...input.output },
    metadata: meta,
    summary: summary(input.steps, input.startedAt),
    logs: input.logs.map((log) => ({ ...log })),
  };
}

async function executeStep(step: FactoryStepName, input: FactoryWorkflowInput, workflowOutput: Partial<Record<FactoryStepName, unknown>>) {
  const agent = getAgent(step);
  if (!agent) throw new Error(`${step} agent is not registered.`);
  const previousStep = factorySteps[Math.max(0, factorySteps.indexOf(step) - 1)];
  const previousOutput = step === "research" ? null : workflowOutput[previousStep];
  const task: AgentTask = {
    id: `factory-${step}-${crypto.randomUUID()}`,
    agentType: step,
    status: "running",
    createdAt: now(),
    updatedAt: now(),
    input: {
      previousAgent: step === "research" ? null : previousStep,
      previousOutput,
      workflowOutput: { ...workflowOutput },
      originalInput: workflowInput(input),
    },
    output: null,
    dependencies: [],
  };

  return agent.execute(task);
}

export function executeResearchStep(input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>> = {}) {
  return executeStep("research", input, output);
}

export function executeScriptStep(input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>>) {
  return executeStep("script", input, output);
}

export function executeStoryboardStep(input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>>) {
  return executeStep("storyboard", input, output);
}

export function executeThumbnailStep(input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>>) {
  return executeStep("thumbnail", input, output);
}

export function executeVoiceStep(input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>>) {
  return executeStep("voice", input, output);
}

export function executeVideoStep(input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>>) {
  return executeStep("video", input, output);
}

export function executePublishingStep(input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>>) {
  return executeStep("publishing", input, output);
}

const stepExecutors: Record<FactoryStepName, (input: FactoryWorkflowInput, output: Partial<Record<FactoryStepName, unknown>>) => Promise<unknown>> = {
  research: executeResearchStep,
  script: executeScriptStep,
  storyboard: executeStoryboardStep,
  thumbnail: executeThumbnailStep,
  voice: executeVoiceStep,
  video: executeVideoStep,
  publishing: executePublishingStep,
};

export async function runFactoryWorkflow(input: FactoryWorkflowInput, options: RunOptions = {}): Promise<FactoryWorkflowOutput> {
  const workflowId = crypto.randomUUID();
  const startedAt = now();
  const steps = factorySteps.map(initialStep);
  const output: Partial<Record<FactoryStepName, unknown>> = {};
  const logs: FactoryWorkflowSnapshot["logs"] = [
    { id: crypto.randomUUID(), step: "workflow", message: "Factory workflow started.", createdAt: startedAt },
  ];
  let status: FactoryWorkflowMetadata["status"] = "running";
  let completedAt: string | null = null;

  await options.onUpdate?.(snapshot({ workflowId, startedAt, completedAt, currentStep: "research", steps, output, status, logs }));

  for (const stepName of factorySteps) {
    const step = steps.find((item) => item.step === stepName);
    if (!step) continue;
    const stepStartedAt = Date.now();
    step.status = "running";
    step.startedAt = now();
    logs.unshift({ id: crypto.randomUUID(), step: stepName, message: `${stepName} step started.`, createdAt: step.startedAt });
    await options.onUpdate?.(snapshot({ workflowId, startedAt, completedAt, currentStep: stepName, steps, output, status, logs }));

    try {
      const result = await stepExecutors[stepName](input, output);
      const meta = metadataFromOutput(result);
      step.status = "completed";
      step.completedAt = now();
      step.latency = meta.latency || Date.now() - stepStartedAt;
      step.credits = meta.credits;
      step.provider = meta.provider;
      step.output = result;
      output[stepName] = result;
      logs.unshift({ id: crypto.randomUUID(), step: stepName, message: `${stepName} step completed.`, createdAt: step.completedAt });
      await options.onUpdate?.(snapshot({ workflowId, startedAt, completedAt, currentStep: stepName, steps, output, status, logs }));
    } catch (error) {
      step.status = "failed";
      step.completedAt = now();
      step.latency = Date.now() - stepStartedAt;
      step.error = error instanceof Error ? error.message : `${stepName} step failed.`;
      status = "failed";
      completedAt = now();
      logs.unshift({ id: crypto.randomUUID(), step: stepName, message: `${stepName} step failed: ${step.error}`, createdAt: completedAt });
      await options.onUpdate?.(snapshot({ workflowId, startedAt, completedAt, currentStep: stepName, steps, output, status, logs }));
      break;
    }
  }

  if (status !== "failed") {
    status = "completed";
    completedAt = now();
    logs.unshift({ id: crypto.randomUUID(), step: "workflow", message: "Factory workflow completed.", createdAt: completedAt });
    await options.onUpdate?.(snapshot({ workflowId, startedAt, completedAt, currentStep: "complete", steps, output, status, logs }));
  }

  const finalMetadata = metadata(workflowId, startedAt, completedAt, steps, status);
  return {
    research: output.research ?? null,
    script: output.script ?? null,
    storyboard: output.storyboard ?? null,
    thumbnail: output.thumbnail ?? null,
    voice: output.voice ?? null,
    video: output.video ?? null,
    publishing: output.publishing ?? null,
    metadata: finalMetadata,
    summary: summary(steps, startedAt),
  };
}
