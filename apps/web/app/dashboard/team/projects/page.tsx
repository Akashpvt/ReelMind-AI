import Link from "next/link";
import { AssignProjectForm, CreateProjectForm, StatusMoveForm } from "@/components/team/project-actions";
import { Metric, TeamShell } from "@/components/team/team-shell";
import { boardProjectStatuses, canManageClientProjects, priorityBadgeClass, statusLabel, type ProjectStatus } from "@/lib/team/project-types";
import { loadTeamData } from "@/lib/team/load-team-data";
import { createAdminClient } from "@/lib/supabase/admin";


export const dynamic = "force-dynamic";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function TeamProjectsPage() {
  const { activeTeam, projects, members } = await loadTeamData();
  const role = activeTeam?.role ?? null;
  const organization = activeTeam?.organization;
  const canManage = canManageClientProjects(role);
  const memberOptions = members.map((member) => ({
    id: member.id,
    user_id: member.user_id,
    displayName: member.displayName,
    displayEmail: member.displayEmail,
    role: member.role,
  }));
  const adminSupabase = createAdminClient();
  const { data: invoiceRows } = organization?.id
    ? await adminSupabase
      .from("project_invoices")
      .select("amount,status,currency")
      .eq("organization_id", organization.id)
    : { data: [] };
  const invoices = (invoiceRows ?? []) as Array<{ amount: number | string; status: string; currency: string | null }>;
  const totalRevenue = invoices
    .filter((invoice) => invoice.status !== "cancelled")
    .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const pendingRevenue = invoices
    .filter((invoice) => invoice.status === "pending" || invoice.status === "partially_paid")
    .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const paidRevenue = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + Number(invoice.amount ?? 0), 0);
  const outstandingInvoices = invoices.filter((invoice) => invoice.status === "pending" || invoice.status === "partially_paid").length;

  const reviewProjects = projects.filter(
    (project) => project.status === "review"
  );

  const approvedProjects = projects.filter(
    (project) => project.status === "approved"
  );

  const deliveredProjects = projects.filter(
    (project) => project.status === "delivered");

  return (
    <TeamShell title="Client Projects" subtitle="Plan, assign, review, and deliver client reel packages inside the agency workspace.">
      <section className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <Metric label="Total Revenue" value={formatCurrency(totalRevenue)} detail={organization?.name ?? "No organization"} />
        <Metric label="Pending Revenue" value={formatCurrency(pendingRevenue)} detail="pending and partial invoices" />
        <Metric label="Paid Revenue" value={formatCurrency(paidRevenue)} detail="paid invoices" />
        <Metric label="Outstanding Invoices" value={outstandingInvoices} detail="awaiting payment" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <Metric label="Total Projects" value={projects.length} detail="active board items" />
        <Metric label="In Review" value={reviewProjects.length} detail="awaiting approval" />
        <Metric label="Approved" value={approvedProjects.length} detail="ready for delivery" />
        <Metric label="Delivered" value={deliveredProjects.length} detail="completed work" />
      </section>

      <section className="mt-4">
        <CreateProjectForm organizationId={organization?.id} canCreate={canManage} />
      </section>

      <section className="mt-4 grid gap-4 xl:grid-cols-6">
        {boardProjectStatuses.map((status) => {

          const columnProjects = projects.filter(
          (project) => String(project.status).toLowerCase().trim() === status
           );

          return (
            <div key={status} className="rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyberBlue">{statusLabel(status)}</p>
                <span className="rounded-full border border-white/10 px-2 py-1 text-xs text-mist">{columnProjects.length}</span>
              </div>
              <div className="mt-4 space-y-3">
                {columnProjects.length ? columnProjects.map((project) => {
                  const assignedMember = members.find((member) => member.user_id === (project.assigned_member_id ?? project.assigned_to));
                  const assignedName = project.assigned_member_name ?? assignedMember?.displayName ?? "Unassigned";
                  return (
                    <article key={project.id} className="rounded-2xl border border-white/10 bg-ink/50 p-3 transition hover:border-cyberBlue/40">
                      <Link href={`/dashboard/team/projects/${project.id}`} className="block">
                        <p className="text-sm font-semibold text-frost">{project.project_title}</p>
                      </Link>
                      <p className="mt-1 text-xs text-mist">{project.client_name}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${priorityBadgeClass(project.priority)}`}>{project.priority}</span>
                        <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-mist">{formatCurrency(Number(project.budget ?? 0))}</span>
                      </div>
                      <p className="mt-3 text-xs text-mist">
                        {project.deadline ? `Due ${new Date(project.deadline).toLocaleDateString()}` : "No deadline"}
                      </p>
                      <StatusMoveForm projectId={project.id} currentStatus={project.status as ProjectStatus} />
                      <p className="mt-1 truncate text-xs text-cyberBlue">{assignedName}</p>
                      {canManage ? (
                        <div className="mt-3">
                          <AssignProjectForm projectId={project.id} assignedMemberId={project.assigned_member_id ?? project.assigned_to} members={memberOptions} compact />
                        </div>
                      ) : null}
                    </article>
                  );
                }) : (
                  <p className="rounded-2xl border border-dashed border-white/10 p-3 text-xs text-mist">No projects.</p>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </TeamShell>
  );
}
