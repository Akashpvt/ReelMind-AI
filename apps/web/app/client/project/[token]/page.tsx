/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { ClientInvoices } from "@/components/client/client-invoices";
import { ClientFileVault } from "@/components/client/client-file-vault";
import { ClientNotifications } from "@/components/client/client-notifications";
import { ClientPortalActions } from "@/components/client/client-portal-actions";
import { ClientProjectMessages } from "@/components/client/client-project-messages";
import type { ProjectFileItem } from "@/components/team/project-file-vault";
import type { ProjectInvoiceItem } from "@/components/team/project-invoices";
import type { ProjectMessageItem } from "@/components/team/project-messages";
import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationRow } from "@/lib/team/notifications";
import { statusLabel } from "@/lib/team/project-types";
import { getWorkspaceBranding } from "@/lib/team/branding";

export const dynamic = "force-dynamic";

type PortalProject = {
  id: string;
  client_name: string;
  project_title: string;
  project_description: string | null;
  status: string;
  deadline: string | null;
  updated_at: string;
};

type PortalDeliverable = {
  id: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

function progressForStatus(status: string) {
  const progressByStatus: Record<string, number> = {
    brief: 8,
    planning: 20,
    scripting: 38,
    production: 58,
    review: 78,
    approved: 90,
    revision_requested: 72,
    delivered: 100,
  };
  return progressByStatus[status] ?? 10;
}

function formatDate(value: string | null) {
  if (!value) return "No due date";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default async function ClientProjectPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const adminSupabase = createAdminClient();
  const { data: access, error: accessError } = await adminSupabase
    .from("client_project_access")
    .select("id,organization_id,project_id,client_email,status,expires_at")
    .eq("access_token", token)
    .single();

  if (accessError || !access || access.status !== "active" || isExpired(access.expires_at)) {
    notFound();
  }

  const [projectResult, deliverablesResult, filesResult, invoicesResult, messagesResult, notificationsResult, branding] = await Promise.all([
    adminSupabase
      .from("client_projects")
      .select("id,client_name,project_title,project_description,status,deadline,updated_at")
      .eq("id", access.project_id)
      .single(),
    adminSupabase
      .from("project_deliverables")
      .select("id,file_name,file_url,created_at")
      .eq("project_id", access.project_id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_files")
      .select("id,organization_id,project_id,file_name,file_url,file_size,file_type,uploaded_by,created_at")
      .eq("project_id", access.project_id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_invoices")
      .select("id,organization_id,project_id,invoice_number,amount,currency,status,issued_at,paid_at,notes,created_by,created_at")
      .eq("project_id", access.project_id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_messages")
      .select("id,organization_id,project_id,sender_type,sender_name,message,created_at")
      .eq("project_id", access.project_id)
      .order("created_at", { ascending: true }),
    adminSupabase
      .from("notifications")
      .select("id,organization_id,user_id,project_id,title,message,type,is_read,created_at")
      .eq("project_id", access.project_id)
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(12),
    getWorkspaceBranding(access.organization_id),
  ]);

  if (projectResult.error || !projectResult.data) {
    notFound();
  }

  const project = projectResult.data as PortalProject;
  const deliverables = (deliverablesResult.data ?? []) as PortalDeliverable[];
  const files = (filesResult.data ?? []) as ProjectFileItem[];
  const invoices = (invoicesResult.data ?? []) as ProjectInvoiceItem[];
  const messages = (messagesResult.data ?? []) as ProjectMessageItem[];
  const notifications = (notificationsResult.data ?? []) as NotificationRow[];
  const progress = progressForStatus(project.status);

  return (
    <main className="min-h-screen bg-ink px-4 py-6 text-frost sm:px-6" style={{ "--workspace-accent": branding.primaryColor } as CSSProperties}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(18,181,255,0.18),transparent_32%),radial-gradient(circle_at_84%_20%,rgba(168,85,247,0.14),transparent_30%)]" />
      <div className="relative mx-auto max-w-5xl">
        <header className="py-6">
          <div className="flex items-center gap-3">{branding.logoUrl ? <><img src={branding.logoUrl} alt="" className="h-10 w-10 rounded-xl object-contain" /></> : null}<p className="text-xs font-semibold uppercase tracking-[0.28em]" style={{ color: branding.primaryColor }}>{branding.agencyName} Client Portal</p></div>
          <h1 className="mt-3 text-4xl font-semibold text-frost">{project.project_title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">{project.project_description ?? `${project.client_name} project workspace and delivery review.`}</p>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Current Status</p>
                <h2 className="mt-2 text-2xl font-semibold text-frost">{statusLabel(project.status)}</h2>
              </div>
              <span className="w-fit rounded-full border border-cyberBlue/30 bg-cyberBlue/[0.08] px-3 py-1 text-xs font-semibold text-cyberBlue">{progress}%</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: branding.primaryColor }} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoTile title="Client" detail={project.client_name} />
              <InfoTile title="Due Date" detail={formatDate(project.deadline)} />
              <InfoTile title="Updated" detail={new Date(project.updated_at).toLocaleString()} />
              <InfoTile title="Approval Status" detail={statusLabel(project.status)} />
            </div>
          </article>

          <ClientPortalActions token={token} canAct={project.status === "review"} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <ClientNotifications notifications={notifications} />
          <ClientFileVault token={token} files={files} />
          <ClientInvoices invoices={invoices} agencyName={branding.agencyName} supportEmail={branding.supportEmail} />

          <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Deliverables</p>
            <div className="mt-4 space-y-3">
              {deliverables.length ? deliverables.map((deliverable) => (
                <article key={deliverable.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
                  <a href={deliverable.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-frost transition hover:text-cyberBlue">{deliverable.file_name}</a>
                  <p className="mt-2 text-xs text-mist">{new Date(deliverable.created_at).toLocaleString()}</p>
                </article>
              )) : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No deliverables yet.</p>}
            </div>
          </section>

          <ClientProjectMessages token={token} messages={messages} />
        </section>
      </div>
      {branding.customFooter ? <footer className="relative mx-auto max-w-5xl py-8 text-center text-xs text-mist">{branding.customFooter}</footer> : null}
    </main>
  );
}

function InfoTile({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink/45 p-3">
      <p className="text-xs uppercase tracking-[0.16em] text-mist">{title}</p>
      <p className="mt-2 text-sm font-semibold text-frost">{detail}</p>
    </div>
  );
}
