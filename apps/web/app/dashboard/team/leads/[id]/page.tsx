import Link from "next/link";
import { notFound } from "next/navigation";
import { ConvertLeadForm, LeadStatusForm } from "@/components/team/lead-actions";
import { ListCard, Row, TeamShell } from "@/components/team/team-shell";
import { canManageLeads, leadActivityLabel, leadStatusLabel, type LeadStatus } from "@/lib/team/lead-types";
import { loadLeadActivity, loadLeadRows } from "@/lib/team/leads";
import { loadTeamData } from "@/lib/team/load-team-data";

export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function metadataSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "No metadata";
  const entries = Object.entries(metadata as Record<string, unknown>);
  return entries.length ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" / ") : "No metadata";
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { activeTeam } = await loadTeamData();
  const organization = activeTeam?.organization;
  const role = activeTeam?.role ?? null;
  if (!organization?.id) notFound();

  const leads = await loadLeadRows(organization.id);
  const lead = leads.find((item) => item.id === id);
  if (!lead) notFound();

  const activity = await loadLeadActivity(organization.id, lead.id);
  const canManage = canManageLeads(role);

  return (
    <TeamShell title={lead.name} subtitle="Lead profile, pipeline status, activity, and conversion controls.">
      <div className="mb-4">
        <Link href="/dashboard/team/leads" className="text-sm text-cyberBlue transition hover:text-frost">Back to leads</Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Lead Overview</p>
          <h2 className="mt-2 text-3xl font-semibold text-frost">{lead.name}</h2>
          <p className="mt-2 text-sm text-mist">{lead.notes ?? "No notes yet."}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Row title="Email" detail={lead.email ?? "No email"} />
            <Row title="Phone" detail={lead.phone ?? "No phone"} />
            <Row title="Source" detail={lead.source ?? "No source"} />
            <Row title="Budget" detail={formatCurrency(Number(lead.budget ?? 0))} />
            <Row title="Status" detail={leadStatusLabel(lead.status)} />
            <Row title="Created" detail={new Date(lead.created_at).toLocaleString()} />
          </div>
        </article>

        <div className="space-y-4">
          <LeadStatusForm leadId={lead.id} currentStatus={lead.status as LeadStatus} canManage={canManage} />
          <ConvertLeadForm leadId={lead.id} canConvert={canManage} convertedProjectId={lead.converted_project_id} />
          {lead.converted_project_id ? (
            <Link href={`/dashboard/team/projects/${lead.converted_project_id}`} className="block rounded-2xl border border-cyberBlue/30 bg-cyberBlue/[0.08] p-4 text-sm font-semibold text-cyberBlue transition hover:bg-cyberBlue hover:text-ink">
              Open Converted Project
            </Link>
          ) : null}
        </div>
      </section>

      <section className="mt-4">
        <ListCard title="Lead Activity Timeline" empty="No lead activity yet.">
          {activity.map((entry) => (
            <Row key={entry.id} title={leadActivityLabel(entry.action)} detail={`${metadataSummary(entry.metadata)} / ${new Date(entry.created_at).toLocaleString()}`} />
          ))}
        </ListCard>
      </section>
    </TeamShell>
  );
}
