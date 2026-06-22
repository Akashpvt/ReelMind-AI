import { createAdminClient } from "@/lib/supabase/admin";
import type { Lead, LeadActivity } from "@/lib/team/lead-types";

export const leadSelect = "id,organization_id,name,email,phone,source,budget,notes,status,assigned_to,converted_project_id,created_by,created_at,updated_at";

export async function loadLeadRows(organizationId: string) {
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("leads")
    .select(leadSelect)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Lead[];
}

export async function loadLeadActivity(organizationId: string, leadId: string) {
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("lead_activity_logs")
    .select("id,organization_id,lead_id,user_id,action,metadata,created_at")
    .eq("organization_id", organizationId)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadActivity[];
}

export function leadAnalytics(leads: Lead[]) {
  const wonLeads = leads.filter((lead) => lead.status === "won");
  const lostLeads = leads.filter((lead) => lead.status === "lost");
  const openLeads = leads.filter((lead) => lead.status !== "won" && lead.status !== "lost");
  const pipelineValue = leads
    .filter((lead) => lead.status !== "lost")
    .reduce((sum, lead) => sum + Number(lead.budget ?? 0), 0);
  const wonValue = wonLeads.reduce((sum, lead) => sum + Number(lead.budget ?? 0), 0);

  return {
    totalLeads: leads.length,
    openLeads: openLeads.length,
    wonLeads: wonLeads.length,
    lostLeads: lostLeads.length,
    pipelineValue,
    wonValue,
    conversionRate: leads.length ? Math.round((wonLeads.length / leads.length) * 100) : 0,
  };
}
