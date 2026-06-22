export const projectStatuses = ["brief", "planning", "scripting", "production", "review", "approved", "revision_requested", "delivered", "archived"] as const;
export const boardProjectStatuses = ["brief", "planning", "scripting", "production", "review", "approved", "revision_requested", "delivered"] as const;
export const workflowProjectStatuses = ["planning", "scripting", "production", "review", "approved", "delivered"] as const;
export const projectPriorities = ["low", "medium", "high", "urgent"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];
export type ProjectPriority = (typeof projectPriorities)[number];

export type ClientProject = {
  id: string;
  organization_id: string;
  client_name: string;
  client_email: string | null;
  project_title: string;
  project_description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  budget: number;
  deadline: string | null;
  assigned_to: string | null;
  assigned_member_id: string | null;
  assigned_member_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectActivity = {
  id: string;
  organization_id: string;
  project_id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function isProjectStatus(value: unknown): value is ProjectStatus {
  return typeof value === "string" && projectStatuses.includes(value as ProjectStatus);
}

export function isWorkflowProjectStatus(value: unknown): value is (typeof workflowProjectStatuses)[number] {
  return typeof value === "string" && workflowProjectStatuses.includes(value as (typeof workflowProjectStatuses)[number]);
}

export function nextWorkflowStatus(status: string) {
  const currentIndex = workflowProjectStatuses.findIndex((item) => item === status);
  return currentIndex >= 0 ? workflowProjectStatuses[currentIndex + 1] ?? null : null;
}

export function isProjectPriority(value: unknown): value is ProjectPriority {
  return typeof value === "string" && projectPriorities.includes(value as ProjectPriority);
}

export function canManageClientProjects(role?: string | null) {
  return role === "owner" || role === "admin" || role === "manager";
}

export function statusLabel(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function priorityBadgeClass(priority: string) {
  if (priority === "urgent") return "border-[#FB7185]/30 bg-[#FB7185]/10 text-[#FDA4AF]";
  if (priority === "high") return "border-[#F97316]/30 bg-[#F97316]/10 text-[#FDBA74]";
  if (priority === "low") return "border-white/10 bg-white/[0.04] text-mist";
  return "border-cyberBlue/30 bg-cyberBlue/[0.08] text-cyberBlue";
}

export function activityLabel(action: string) {
  if (action === "notification_created") return "Notification Created";
  if (action === "notification_read") return "Notification Read";
  if (action === "email_sent") return "Email Sent";
  if (action === "email_failed") return "Email Failed";
  if (action === "email_settings_updated") return "Email Settings Updated";
  if (action === "subscription_updated") return "Subscription Updated";
  if (action === "usage_limit_reached") return "Usage Limit Reached";
  if (action === "analytics_viewed") return "Analytics Viewed";
  if (action === "invoice_created") return "Invoice Created";
  if (action === "invoice_paid") return "Invoice Paid";
  if (action === "invoice_cancelled") return "Invoice Cancelled";
  if (action === "file_uploaded") return "File Uploaded";
  if (action === "file_deleted") return "File Deleted";
  if (action === "file_downloaded") return "File Downloaded";
  if (action === "agency_message_sent") return "Agency Message Sent";
  if (action === "client_message_sent") return "Client Message Sent";
  if (action === "client_approved_project") return "Client Approved Project";
  if (action === "client_requested_revision") return "Client Requested Revision";
  if (action === "project_approved") return "Project Approved";
  if (action === "revision_requested") return "Revision Requested";
  if (action === "project_delivered") return "Project Delivered";
  return action.replaceAll("_", " ");
}
