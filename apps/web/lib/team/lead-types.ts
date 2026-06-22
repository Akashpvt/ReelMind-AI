export const leadStatuses = ["new", "qualified", "proposal", "negotiation", "won", "lost"] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export type Lead = {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string | null;
  budget: number | string | null;
  notes: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  converted_project_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadActivity = {
  id: string;
  organization_id: string;
  lead_id: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && leadStatuses.includes(value as LeadStatus);
}

export function leadStatusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function canManageLeads(role?: string | null) {
  return role === "owner" || role === "manager";
}

export function leadActivityLabel(action: string) {
  if (action === "lead_created") return "Lead Created";
  if (action === "lead_updated") return "Lead Updated";
  if (action === "lead_status_changed") return "Lead Status Changed";
  if (action === "lead_converted") return "Lead Converted";
  return action.replaceAll("_", " ");
}
