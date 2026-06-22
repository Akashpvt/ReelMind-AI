export type FactoryStepName = "research" | "script" | "storyboard" | "thumbnail" | "voice" | "video" | "publishing";

export type FactoryWorkflowStatus = "running" | "completed" | "failed";

export type FactoryWorkflowInput = {
  topic: string;
  niche: string;
  duration: "15s" | "30s" | "60s";
  platform: string;
};

export type FactoryStepStatus = "queued" | "running" | "completed" | "failed";

export type FactoryStepResult = {
  step: FactoryStepName;
  status: FactoryStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  latency: number;
  credits: number;
  provider: string | null;
  output: unknown;
  error: string | null;
};

export type FactoryWorkflowMetadata = {
  workflowId: string;
  startedAt: string;
  completedAt: string | null;
  totalLatency: number;
  totalCredits: number;
  providersUsed: string[];
  status: FactoryWorkflowStatus;
};

export type FactorySummary = {
  completedSteps: FactoryStepName[];
  failedSteps: FactoryStepName[];
  executionTime: number;
  creditsUsed: number;
};

export type FactoryWorkflowOutput = {
  research: unknown;
  script: unknown;
  storyboard: unknown;
  thumbnail: unknown;
  voice: unknown;
  video: unknown;
  publishing: unknown;
  metadata: FactoryWorkflowMetadata;
  summary: FactorySummary;
};

export type FactoryWorkflowSnapshot = {
  workflowId: string;
  currentStep: FactoryStepName | "complete";
  progress: number;
  status: FactoryWorkflowStatus;
  steps: FactoryStepResult[];
  output: Partial<Record<FactoryStepName, unknown>>;
  metadata: FactoryWorkflowMetadata;
  summary: FactorySummary;
  logs: Array<{
    id: string;
    step: FactoryStepName | "workflow";
    message: string;
    createdAt: string;
  }>;
};
