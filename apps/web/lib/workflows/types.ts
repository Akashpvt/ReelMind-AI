export const workflowTriggers = ["project_created", "project_assigned", "status_changed", "client_approved", "invoice_paid", "lead_created", "lead_converted", "file_uploaded"] as const;
export type WorkflowTrigger = typeof workflowTriggers[number];
export const workflowActions = ["create_notification", "send_email", "create_task", "update_status", "assign_member", "create_activity_log", "create_project"] as const;
export type WorkflowActionType = typeof workflowActions[number];
export type WorkflowAction = { type: WorkflowActionType; config: Record<string, unknown> };
export type TriggerPayload = Record<string, unknown> & { projectId?: string; leadId?: string; userId?: string; assignedUserId?: string; clientEmail?: string; title?: string };

export function isWorkflowTrigger(value: unknown): value is WorkflowTrigger { return typeof value === "string" && workflowTriggers.includes(value as WorkflowTrigger); }
export function isWorkflowAction(value: unknown): value is WorkflowActionType { return typeof value === "string" && workflowActions.includes(value as WorkflowActionType); }
