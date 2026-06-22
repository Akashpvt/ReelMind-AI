import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentEvent, AgentTask } from "@/lib/agents/types";

export async function persistAgentTask(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null,
  task: AgentTask,
) {
  return supabase.from("agent_tasks").insert({
    id: task.id,
    user_id: userId,
    project_id: projectId,
    agent_type: task.agentType,
    task_type: task.agentType,
    status: task.status,
    input: task.input,
    output: task.output,
    dependencies: task.dependencies,
    metadata: { source: "multi_agent_architecture" },
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  });
}

export async function persistAgentLog(
  supabase: SupabaseClient,
  userId: string,
  projectId: string | null,
  event: AgentEvent,
) {
  return supabase.from("agent_logs").insert({
    id: event.id,
    user_id: userId,
    project_id: projectId,
    agent_task_id: event.taskId,
    agent_type: event.agentType,
    message: event.message,
    created_at: event.createdAt,
  });
}
