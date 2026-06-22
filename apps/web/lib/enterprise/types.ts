export type EnterpriseOrganization = {
  id: string; name: string; slug: string; ownerId: string; ownerName: string; ownerEmail: string;
  status: "active" | "suspended" | "closed"; suspensionReason: string | null; createdAt: string;
  plan: string; subscriptionStatus: string; monthlyRevenue: number; members: number; projects: number;
  leads: number; aiGenerations: number; storageBytes: number; messages: number;
  limits: { maxUsers: number; maxProjects: number; maxLeads: number; maxAiGenerations: number; maxStorageBytes: number; maxMonthlyMessages: number; custom: boolean };
};

export type EnterpriseDashboardData = {
  role: "super_admin" | "support_admin";
  metrics: { mrr: number; arr: number; activeAgencies: number; activeUsers: number; aiUsage: number; storageBytes: number };
  organizations: EnterpriseOrganization[];
  auditLogs: Array<{ id: string; action: string; actor_role: string | null; organization_id: string | null; reason: string | null; metadata: Record<string, unknown>; created_at: string }>;
  isolation: Array<{ table_name: string; rls_enabled: boolean; organization_scoped: boolean; verified: boolean }>;
  impersonation: { organizationId: string; organizationName: string; expiresAt: string } | null;
};
