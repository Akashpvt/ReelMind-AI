import type { WorkflowAction, WorkflowTrigger } from "@/lib/workflows/types";
export type WorkflowTemplate = { key: string; name: string; description: string; trigger: WorkflowTrigger; actions: WorkflowAction[] };
export const workflowTemplates: WorkflowTemplate[] = [
  { key: "notify_assignee", name: "Project Assigned", description: "Notify the assignee as soon as work lands with them.", trigger: "project_assigned", actions: [{ type: "create_notification", config: { recipient: "assignee", title: "New project assigned", message: "{{projectTitle}} was assigned to you." } }] },
  { key: "approved_to_delivered", name: "Client Approved", description: "Move approved client work directly to delivered.", trigger: "client_approved", actions: [{ type: "update_status", config: { status: "delivered" } }] },
  { key: "paid_notify_owner", name: "Invoice Paid", description: "Notify the workspace owner when an invoice is paid.", trigger: "invoice_paid", actions: [{ type: "create_notification", config: { recipient: "owner", title: "Invoice paid", message: "{{invoiceNumber}} has been paid." } }] },
  { key: "converted_create_project", name: "Lead Converted", description: "Ensure every converted lead has a client project.", trigger: "lead_converted", actions: [{ type: "create_project", config: { status: "brief" } }] },
  { key: "file_notify_client", name: "File Uploaded", description: "Notify the client when a new project file is available.", trigger: "file_uploaded", actions: [{ type: "create_notification", config: { recipient: "client", title: "New file available", message: "{{fileName}} was added to your project." } }] },
];
