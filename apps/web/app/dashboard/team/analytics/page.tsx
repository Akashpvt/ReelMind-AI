import { redirect } from "next/navigation";
import { AnalyticsCharts } from "@/components/team/analytics-charts";
import { ListCard, Metric, Row, TeamShell } from "@/components/team/team-shell";
import {
  buildMonthlyRevenue,
  buildOverview,
  buildTeamPerformance,
  buildTopClients,
  loadAnalyticsRows,
  logAnalyticsViewed,
  resolveAnalyticsAccess,
} from "@/lib/team/analytics";
import { activityLabel, statusLabel } from "@/lib/team/project-types";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function metadataSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "No metadata";
  const values = metadata as Record<string, unknown>;
  if (typeof values.message === "string") return values.message;
  if (typeof values.invoiceNumber === "string") return `invoice ${values.invoiceNumber}`;
  if (typeof values.fileName === "string") return `file ${values.fileName}`;
  if (typeof values.projectTitle === "string") return values.projectTitle;
  const entries = Object.entries(values);
  return entries.length
    ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" / ")
    : "No metadata";
}

export default async function AgencyAnalyticsPage() {
  const access = await resolveAnalyticsAccess();

  if (!access.ok && access.status === 401) {
    redirect("/login?next=/dashboard/team/analytics");
  }

  if (!access.ok) {
    return (
      <TeamShell title="Agency Analytics" subtitle="Owners, admins, and managers can view agency analytics.">
        <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-sm font-semibold text-frost">Analytics is not available for your role.</p>
          <p className="mt-2 text-sm text-mist">{access.error}</p>
        </section>
      </TeamShell>
    );
  }

  const { projects, invoices, members, profiles, activity } = await loadAnalyticsRows(access.organizationId);
  await logAnalyticsViewed(access.organizationId, access.userId);

  const overview = buildOverview(projects, invoices, members);
  const revenue = buildMonthlyRevenue(invoices);
  const teamPerformance = buildTeamPerformance(projects, members, profiles);
  const topClients = buildTopClients(projects, invoices);
  const statusDistribution = [...projects.reduce((counts, project) => {
    counts.set(project.status, (counts.get(project.status) ?? 0) + 1);
    return counts;
  }, new Map<string, number>())].map(([name, value]) => ({ name: statusLabel(name), value }));

  return (
    <TeamShell title="Agency Analytics" subtitle={`${access.organizationName} performance, revenue, clients, and team delivery.`}>
      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="Total Projects" value={overview.totalProjects} detail="all client projects" />
        <Metric label="Active Projects" value={overview.activeProjects} detail="not delivered or archived" />
        <Metric label="Review Projects" value={overview.reviewProjects} detail="awaiting approval" />
        <Metric label="Delivered Projects" value={overview.deliveredProjects} detail="completed projects" />
        <Metric label="Total Revenue" value={formatCurrency(overview.totalRevenue)} detail="non-cancelled invoices" />
        <Metric label="Pending Revenue" value={formatCurrency(overview.pendingRevenue)} detail="pending and partial invoices" />
        <Metric label="Paid Revenue" value={formatCurrency(overview.paidRevenue)} detail="paid invoices" />
        <Metric label="Completion Rate" value={`${overview.completionRate}%`} detail={`${overview.activeClients} active clients / ${overview.teamMembers} members`} />
      </section>

      <div className="mt-4">
        <AnalyticsCharts revenue={revenue} statusDistribution={statusDistribution} />
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListCard title="Top Clients" empty="Client revenue will appear after paid invoices.">
          {topClients.map((client) => (
            <Row key={client.clientName} title={client.clientName} detail={`${client.projectCount} projects / ${formatCurrency(client.totalRevenue)}`} />
          ))}
        </ListCard>

        <ListCard title="Team Performance" empty="Assign projects to team members to populate performance.">
          {teamPerformance.map((member) => (
            <Row key={member.member} title={member.member} detail={`${member.assignedProjects} assigned / ${member.completedProjects} completed / ${member.reviewProjects} in review / ${member.completionRate}%`} />
          ))}
        </ListCard>
      </section>

      <section className="mt-4">
        <ListCard title="Recent Activity" empty="Recent project activity will appear here.">
          {activity.map((entry) => (
            <Row key={entry.id} title={activityLabel(entry.action)} detail={`${metadataSummary(entry.metadata)} / ${new Date(entry.created_at).toLocaleString()}`} />
          ))}
        </ListCard>
      </section>
    </TeamShell>
  );
}
