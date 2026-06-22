import Link from "next/link";
import { CreateLeadForm } from "@/components/team/lead-actions";
import { Metric, TeamShell } from "@/components/team/team-shell";
import { canManageLeads, leadStatuses, leadStatusLabel } from "@/lib/team/lead-types";
import { leadAnalytics, loadLeadRows } from "@/lib/team/leads";
import { loadTeamData } from "@/lib/team/load-team-data";
import { requirePagePermission } from "@/lib/team/permission-guards";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function statusClass(status: string) {
  if (status === "won") return "border-[#86EFAC]/40 bg-[#86EFAC]/10 text-[#86EFAC]";
  if (status === "lost") return "border-[#FDA4AF]/40 bg-[#FDA4AF]/10 text-[#FDA4AF]";
  if (status === "negotiation") return "border-[#FDBA74]/40 bg-[#FDBA74]/10 text-[#FDBA74]";
  return "border-cyberBlue/40 bg-cyberBlue/[0.08] text-cyberBlue";
}

export default async function LeadsPage() {
  await requirePagePermission("leads:manage", "/dashboard/team/leads");
  const { activeTeam } = await loadTeamData();
  const organization = activeTeam?.organization;
  const role = activeTeam?.role ?? null;
  const canManage = canManageLeads(role);
  const leads = organization?.id ? await loadLeadRows(organization.id) : [];
  const analytics = leadAnalytics(leads);

  return (
    <TeamShell title="Lead Pipeline" subtitle="Track agency prospects from first contact to won client projects.">
      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="Total Leads" value={analytics.totalLeads} detail={organization?.name ?? "No organization"} />
        <Metric label="Open Leads" value={analytics.openLeads} detail="active opportunities" />
        <Metric label="Pipeline Value" value={formatCurrency(analytics.pipelineValue)} detail="excluding lost" />
        <Metric label="Conversion Rate" value={`${analytics.conversionRate}%`} detail={`${analytics.wonLeads} won / ${analytics.lostLeads} lost`} />
      </section>

      <section className="mt-4">
        <CreateLeadForm organizationId={organization?.id} canCreate={canManage} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-6">
        {leadStatuses.map((status) => {
          const columnLeads = leads.filter((lead) => lead.status === status);
          return (
            <div key={status} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyberBlue">{leadStatusLabel(status)}</p>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-mist">{columnLeads.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {columnLeads.length ? columnLeads.map((lead) => (
                  <article key={lead.id} className="rounded-2xl border border-white/10 bg-ink/50 p-3 transition hover:border-cyberBlue/40">
                    <Link href={`/dashboard/team/leads/${lead.id}`} className="block">
                      <p className="text-sm font-semibold text-frost">{lead.name}</p>
                    </Link>
                    <p className="mt-1 truncate text-xs text-mist">{lead.email ?? lead.phone ?? "No contact"}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass(lead.status)}`}>{leadStatusLabel(lead.status)}</span>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-mist">{formatCurrency(Number(lead.budget ?? 0))}</span>
                    </div>
                    <p className="mt-3 text-xs text-mist">{lead.source ?? "No source"}</p>
                  </article>
                )) : (
                  <p className="rounded-2xl border border-dashed border-white/10 p-3 text-xs text-mist">No leads.</p>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </TeamShell>
  );
}
