import { BaseAgent } from "@/lib/agents/base-agent";
import {
  AnalyticsAgent,
  LearningAgent,
  PublishingAgent,
  ResearchAgent,
  ScriptAgent,
  StoryboardAgent,
  ThumbnailAgent,
  VideoAgent,
  VoiceAgent,
} from "@/lib/agents/mock-agents";
import type { AgentType } from "@/lib/agents/types";

const registry = new Map<AgentType, BaseAgent>();

export function registerAgent(agent: BaseAgent) {
  registry.set(agent.type, agent);
  return agent;
}

export function getAgent(type: AgentType) {
  return registry.get(type);
}

export function getAllAgents() {
  return Array.from(registry.values());
}

export function registerDefaultAgents() {
  if (registry.size > 0) return getAllAgents();

  [
    new ResearchAgent(),
    new ScriptAgent(),
    new StoryboardAgent(),
    new ThumbnailAgent(),
    new VoiceAgent(),
    new VideoAgent(),
    new PublishingAgent(),
    new AnalyticsAgent(),
    new LearningAgent(),
  ].forEach(registerAgent);

  return getAllAgents();
}

registerDefaultAgents();
