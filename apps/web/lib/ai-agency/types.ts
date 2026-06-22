export const aiAgentTypes = ["project_manager", "sales_agent", "client_success", "content_strategist", "workspace_copilot"] as const;
export type AiAgentType = typeof aiAgentTypes[number];
export type AgencySnapshot = {
  revenue: number; pendingRevenue: number; activeClients: number; activeProjects: number; delayedProjects: number; unpaidInvoices: number; unpaidAmount: number; totalLeads: number; wonLeads: number; leadConversionRate: number;
  leadScores: Array<{ id: string; name: string; status: string; score: number; reason: string }>;
  projectRisks: Array<{ id: string; title: string; client: string; status: string; score: number; reason: string }>;
  clientHealth: Array<{ client: string; score: number; reason: string }>;
};
