import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export type AnalyticsOverview = {
  totalProjects: number;
  activeProjects: number;
  reviewProjects: number;
  deliveredProjects: number;
  totalRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;
  activeClients: number;
  teamMembers: number;
  completionRate: number;
};

export type MonthlyRevenue = {
  month: string;
  revenue: number;
};

export type TeamPerformance = {
  member: string;
  assignedProjects: number;
  completedProjects: number;
  reviewProjects: number;
  completionRate: number;
};

export type TopClient = {
  clientName: string;
  projectCount: number;
  totalRevenue: number;
};

export type AnalyticsActivity = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ProjectRow = {
  id: string;
  client_name: string;
  client_email: string | null;
  status: string;
  assigned_to: string | null;
  assigned_member_id: string | null;
};

type InvoiceRow = {
  project_id: string;
  amount: number | string;
  status: string;
  issued_at: string;
  paid_at: string | null;
};

type MemberRow = {
  id: string;
  user_id: string;
  role: string;
  status: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
};

export type AnalyticsAccess =
  | {
      ok: true;
      userId: string;
      organizationId: string;
      organizationName: string;
      role: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function canViewAgencyAnalytics(role?: string | null) {
  return role === "owner" || role === "admin" || role === "manager";
}

export async function resolveAnalyticsAccess(): Promise<AnalyticsAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const activeTeam = await resolveActiveTeam(user.id);
  if (!activeTeam) {
    return { ok: false, status: 403, error: "No active organization found." };
  }

  if (!canViewAgencyAnalytics(activeTeam.membership.role)) {
    return { ok: false, status: 403, error: "Only owners, admins, and managers can view analytics." };
  }

  return {
    ok: true,
    userId: user.id,
    organizationId: activeTeam.organization.id,
    organizationName: activeTeam.organization.name,
    role: activeTeam.membership.role,
  };
}

export async function loadAnalyticsRows(organizationId: string) {
  const adminSupabase = createAdminClient();
  const [projectsResult, invoicesResult, membersResult, activityResult] = await Promise.all([
    adminSupabase
      .from("client_projects")
      .select("id,client_name,client_email,status,assigned_to,assigned_member_id")
      .eq("organization_id", organizationId),
    adminSupabase
      .from("project_invoices")
      .select("project_id,amount,status,issued_at,paid_at")
      .eq("organization_id", organizationId),
    adminSupabase
      .from("organization_members")
      .select("id,user_id,role,status")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    adminSupabase
      .from("project_activity_logs")
      .select("id,action,metadata,created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const members = (membersResult.data ?? []) as MemberRow[];
  const memberUserIds = members.map((member) => member.user_id);
  const { data: profiles } = memberUserIds.length
    ? await adminSupabase
        .from("profiles")
        .select("id,email,full_name")
        .in("id", memberUserIds)
    : { data: [] };

  return {
    projects: (projectsResult.data ?? []) as ProjectRow[],
    invoices: (invoicesResult.data ?? []) as InvoiceRow[],
    members,
    profiles: (profiles ?? []) as ProfileRow[],
    activity: (activityResult.data ?? []) as AnalyticsActivity[],
  };
}

export function buildOverview(projects: ProjectRow[], invoices: InvoiceRow[], members: MemberRow[]): AnalyticsOverview {
  const deliveredProjects = projects.filter((project) => project.status === "delivered").length;
  const activeProjects = projects.filter((project) => project.status !== "archived" && project.status !== "delivered").length;
  const clientKeys = new Set(projects.map((project) => project.client_email || project.client_name).filter(Boolean));
  const paidRevenue = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const pendingRevenue = invoices
    .filter((invoice) => invoice.status === "pending" || invoice.status === "partially_paid")
    .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const totalRevenue = invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);

  return {
    totalProjects: projects.length,
    activeProjects,
    reviewProjects: projects.filter((project) => project.status === "review").length,
    deliveredProjects,
    totalRevenue,
    pendingRevenue,
    paidRevenue,
    activeClients: clientKeys.size,
    teamMembers: members.length,
    completionRate: projects.length ? Math.round((deliveredProjects / projects.length) * 100) : 0,
  };
}

export function buildMonthlyRevenue(invoices: InvoiceRow[]): MonthlyRevenue[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: new Date(currentYear, index, 1).toLocaleString("en-US", { month: "short" }),
    revenue: 0,
  }));

  invoices
    .filter((invoice) => invoice.status === "paid")
    .forEach((invoice) => {
      const paidDate = new Date(invoice.paid_at ?? invoice.issued_at);
      if (paidDate.getFullYear() === currentYear) {
        months[paidDate.getMonth()].revenue += Number(invoice.amount ?? 0);
      }
    });

  return months;
}

export function buildTeamPerformance(projects: ProjectRow[], members: MemberRow[], profiles: ProfileRow[]): TeamPerformance[] {
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  return members.map((member) => {
    const profile = profileById.get(member.user_id);
    const memberProjects = projects.filter((project) => (project.assigned_member_id ?? project.assigned_to) === member.user_id);
    const completedProjects = memberProjects.filter((project) => project.status === "delivered").length;
    const reviewProjects = memberProjects.filter((project) => project.status === "review").length;
    return {
      member: profile?.full_name || profile?.email || `${member.user_id.slice(0, 8)}...`,
      assignedProjects: memberProjects.length,
      completedProjects,
      reviewProjects,
      completionRate: memberProjects.length ? Math.round((completedProjects / memberProjects.length) * 100) : 0,
    };
  });
}

export function buildTopClients(projects: ProjectRow[], invoices: InvoiceRow[]): TopClient[] {
  const projectById = new Map(projects.map((project) => [project.id, project]));
  const clients = new Map<string, TopClient>();

  projects.forEach((project) => {
    const existing = clients.get(project.client_name) ?? { clientName: project.client_name, projectCount: 0, totalRevenue: 0 };
    existing.projectCount += 1;
    clients.set(project.client_name, existing);
  });

  invoices
    .filter((invoice) => invoice.status === "paid")
    .forEach((invoice) => {
      const project = projectById.get(invoice.project_id);
      if (!project) return;
      const existing = clients.get(project.client_name) ?? { clientName: project.client_name, projectCount: 0, totalRevenue: 0 };
      existing.totalRevenue += Number(invoice.amount ?? 0);
      clients.set(project.client_name, existing);
    });

  return [...clients.values()]
    .sort((a, b) => b.totalRevenue - a.totalRevenue || b.projectCount - a.projectCount)
    .slice(0, 8);
}

export async function logAnalyticsViewed(organizationId: string, userId: string) {
  const adminSupabase = createAdminClient();
  await adminSupabase.from("team_activity_logs").insert({
    organization_id: organizationId,
    user_id: userId,
    action: "analytics_viewed",
    metadata: { viewedAt: new Date().toISOString() },
  });
}
