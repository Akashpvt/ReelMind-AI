export type AgentType =
  | "research"
  | "script"
  | "storyboard"
  | "thumbnail"
  | "voice"
  | "video"
  | "publishing"
  | "analytics"
  | "learning";

export type AgentStatus = "idle" | "queued" | "running" | "completed" | "failed";

export interface AgentTask {
  id: string;
  agentType: AgentType;
  status: AgentStatus;
  createdAt: string;
  updatedAt: string;
  input: unknown;
  output: unknown;
  dependencies: string[];
}

export type AgentEvent = {
  id: string;
  taskId: string;
  agentType: AgentType;
  message: string;
  createdAt: string;
};

export type AgentDefinition = {
  type: AgentType;
  name: string;
  description: string;
};
