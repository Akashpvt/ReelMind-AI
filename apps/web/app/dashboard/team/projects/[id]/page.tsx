import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientPortalAccess } from "@/components/team/client-portal-access";
import { ProjectDeliverables, type ProjectDeliverableItem } from "@/components/team/project-deliverables";
import { ProjectFileVault, type ProjectFileItem } from "@/components/team/project-file-vault";
import { ProjectInvoices, type ProjectInvoiceItem } from "@/components/team/project-invoices";
import { ProjectMessages, type ProjectMessageItem } from "@/components/team/project-messages";
import { ProjectNotes, type ProjectNoteItem } from "@/components/team/project-notes";
import { AssignProjectForm, ProjectApprovalActions, ProjectStatusForm } from "@/components/team/project-actions";
import { ListCard, Row, TeamShell } from "@/components/team/team-shell";
import { activityLabel, canManageClientProjects, priorityBadgeClass, statusLabel, type ProjectActivity, type ProjectStatus } from "@/lib/team/project-types";
import { loadTeamData } from "@/lib/team/load-team-data";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function metadataSummary(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") return "No metadata";
  const values = metadata as Record<string, unknown>;
  if (typeof values.message === "string") return values.message;
  if (typeof values.notePreview === "string") return `note: ${values.notePreview}`;
  if (typeof values.fileName === "string") return `deliverable: ${values.fileName}`;
  if (typeof values.messagePreview === "string") return `message: ${values.messagePreview}`;
  const entries = Object.entries(values);
  return entries.length
    ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" / ")
    : "No metadata";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function shortUserId(userId: string) {
  return `${userId.slice(0, 8)}...`;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { activeTeam, projects, members } = await loadTeamData();
  const project = projects.find((item) => item.id === id);

  if (!project) {
    notFound();
  }

  const role = activeTeam?.role ?? null;
  const canManage = canManageClientProjects(role);
  const assignedMember = members.find((member) => member.user_id === (project.assigned_member_id ?? project.assigned_to));
  const assignedMemberName = project.assigned_member_name ?? assignedMember?.displayName ?? "Unassigned";
  const assignedMemberRole = assignedMember?.role ? statusLabel(assignedMember.role) : "No role";
  const memberNameByUserId = new Map(members.map((member) => [member.user_id, member.displayName]));
  const adminSupabase = createAdminClient();
  const [activityResult, notesResult, deliverablesResult, messagesResult, filesResult, invoicesResult, accessResult] = await Promise.all([
    adminSupabase
      .from("project_activity_logs")
      .select("id,organization_id,project_id,user_id,action,metadata,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_notes")
      .select("id,organization_id,project_id,user_id,note,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_deliverables")
      .select("id,organization_id,project_id,uploaded_by,file_name,file_url,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_messages")
      .select("id,organization_id,project_id,sender_type,sender_name,message,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("project_files")
      .select("id,organization_id,project_id,file_name,file_url,file_size,file_type,uploaded_by,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_invoices")
      .select("id,organization_id,project_id,invoice_number,amount,currency,status,issued_at,paid_at,notes,created_by,created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("client_project_access")
      .select("access_token,client_email,status")
      .eq("project_id", project.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const notes = ((notesResult.data ?? []) as Array<Omit<ProjectNoteItem, "authorName">>).map((note) => ({
    ...note,
    authorName: memberNameByUserId.get(note.user_id) ?? shortUserId(note.user_id),
  }));
  const deliverables = ((deliverablesResult.data ?? []) as Array<Omit<ProjectDeliverableItem, "uploaderName">>).map((deliverable) => ({
    ...deliverable,
    uploaderName: memberNameByUserId.get(deliverable.uploaded_by) ?? shortUserId(deliverable.uploaded_by),
  }));
  const messages = (messagesResult.data ?? []) as ProjectMessageItem[];
  const files = (filesResult.data ?? []) as ProjectFileItem[];
  const invoices = (invoicesResult.data ?? []) as ProjectInvoiceItem[];
  const existingAccess = (accessResult.data ?? [])[0] as { access_token: string; client_email: string } | undefined;
  const existingPortalUrl = existingAccess ? `/client/project/${existingAccess.access_token}` : null;

  return (
    <TeamShell title={project.project_title} subtitle={`${project.client_name} workspace, timeline, assignment, and delivery status.`}>
      <div className="mb-4">
        <Link href="/dashboard/team/projects" className="text-sm text-cyberBlue transition hover:text-frost">Back to projects</Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Project Overview</p>
              <h2 className="mt-2 text-3xl font-semibold text-frost">{project.project_title}</h2>
              <p className="mt-2 text-sm text-mist">{project.project_description ?? "No project description yet."}</p>
            </div>
            <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${priorityBadgeClass(project.priority)}`}>{project.priority}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Row title="Client" detail={`${project.client_name}${project.client_email ? ` / ${project.client_email}` : ""}`} />
            <Row title="Status" detail={statusLabel(project.status)} />
            <Row title="Budget" detail={formatCurrency(Number(project.budget ?? 0))} />
            <Row title="Deadline" detail={project.deadline ? new Date(project.deadline).toLocaleString() : "No deadline"} />
            <Row title="Assigned Member" detail={assignedMemberName} />
            <Row title="Member Role" detail={assignedMemberRole} />
            <Row title="Updated" detail={new Date(project.updated_at ?? project.created_at).toLocaleString()} />
          </div>
        </article>

        <div className="space-y-4">
          {canManage ? (
            <>
              <ProjectStatusForm projectId={project.id} currentStatus={project.status as ProjectStatus} />
              <ProjectApprovalActions projectId={project.id} currentStatus={project.status as ProjectStatus} />
              <ClientPortalAccess projectId={project.id} defaultClientEmail={existingAccess?.client_email ?? project.client_email} existingPortalUrl={existingPortalUrl} />
              <AssignProjectForm projectId={project.id} assignedMemberId={project.assigned_member_id ?? project.assigned_to} members={members.map((member) => ({
                id: member.id,
                user_id: member.user_id,
                displayName: member.displayName,
                displayEmail: member.displayEmail,
                role: member.role,
              }))} />
            </>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm text-mist">Project controls are available to owners, admins, managers, and editors.</p>
          )}
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ProjectNotes projectId={project.id} notes={notes} />
        <ProjectDeliverables projectId={project.id} deliverables={deliverables} />
      </section>

      <section className="mt-4">
        <ProjectFileVault projectId={project.id} files={files} />
      </section>

      <section className="mt-4">
        <ProjectInvoices projectId={project.id} invoices={invoices} />
      </section>

      <section className="mt-4">
        <ProjectMessages projectId={project.id} messages={messages} />
      </section>

      <section className="mt-4">
        <ListCard title="Activity Timeline" empty="No project activity yet.">
          {((activityResult.data ?? []) as ProjectActivity[]).map((entry) => (
            <Row key={entry.id} title={activityLabel(entry.action)} detail={`${metadataSummary(entry.metadata)} / ${new Date(entry.created_at).toLocaleString()}`} />
          ))}
        </ListCard>
      </section>
    </TeamShell>
  );
}
