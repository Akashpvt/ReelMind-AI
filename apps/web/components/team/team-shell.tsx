/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { NotificationCenter } from "@/components/team/notification-center";
import type { WorkspaceBranding } from "@/lib/team/branding";
import { getWorkspaceBranding } from "@/lib/team/branding";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export async function TeamShell({ title, subtitle, children, branding }: { title: string; subtitle: string; children: ReactNode; branding?: WorkspaceBranding }) {
  let workspaceBranding = branding;
  if (!workspaceBranding) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const team = user ? await resolveActiveTeam(user.id) : null;
    workspaceBranding = team ? await getWorkspaceBranding(team.organization.id, team.organization.name) : undefined;
  }
  return (
    <main className="min-h-screen bg-ink px-4 py-5 text-frost sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(18,181,255,0.18),transparent_32%),radial-gradient(circle_at_84%_20%,rgba(168,85,247,0.14),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl" style={{ "--workspace-accent": workspaceBranding?.primaryColor ?? "#38BDF8" } as CSSProperties}>
        <nav className="nav-glass nav-glass-scrolled flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:rounded-full sm:px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-frost transition hover:text-cyberBlue">
            {workspaceBranding?.logoUrl ? <><img src={workspaceBranding.logoUrl} alt="" className="h-7 w-7 rounded-lg object-contain" /></> : null}
            {workspaceBranding?.agencyName ?? "ReelMind AI"}
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 text-xs">
              <Link href="/dashboard/team" className="text-cyberBlue">Team</Link>
              <Link href="/dashboard/team/members" className="text-mist transition hover:text-frost">Members</Link>
              <Link href="/dashboard/team/leads" className="text-mist transition hover:text-frost">Leads</Link>
              <Link href="/dashboard/team/projects" className="text-mist transition hover:text-frost">Projects</Link>
              <Link href="/dashboard/team/activity" className="text-mist transition hover:text-frost">Activity</Link>
              <Link href="/dashboard/team/analytics" className="text-mist transition hover:text-frost">Analytics</Link>
              <Link href="/dashboard/team/ai" className="text-mist transition hover:text-frost">AI Team</Link>
              <Link href="/dashboard/team/content-ai" className="text-mist transition hover:text-frost">Content AI</Link>
              <Link href="/dashboard/team/whatsapp" className="text-mist transition hover:text-frost">WhatsApp</Link>
              <Link href="/dashboard/team/publishing" className="text-mist transition hover:text-frost">Publishing</Link>
              <Link href="/dashboard/team/workflows" className="text-mist transition hover:text-frost">Workflows</Link>
              <Link href="/dashboard/team/settings" className="text-mist transition hover:text-frost">Settings</Link>
            </div>
            <NotificationCenter />
          </div>
        </nav>
        <header className="py-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyberBlue">Agency System</p>
          <h1 className="mt-3 text-4xl font-semibold text-frost">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">{subtitle}</p>
        </header>
        {children}
        {workspaceBranding?.customFooter ? <footer className="py-8 text-center text-xs text-mist">{workspaceBranding.customFooter}</footer> : null}
      </div>
    </main>
  );
}

export function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink/45 p-4">
      <p className="text-2xl font-semibold text-frost">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mist">{label}</p>
      <p className="mt-2 text-xs text-cyberBlue">{detail}</p>
    </div>
  );
}

export function ListCard({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">{title}</p>
      <div className="mt-4 space-y-2">
        {hasChildren ? children : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">{empty}</p>}
      </div>
    </section>
  );
}

export function Row({ title, detail }: { title: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-ink/45 p-3">
      <p className="text-sm font-medium text-frost">{title}</p>
      <p className="mt-1 text-xs text-mist">{detail}</p>
    </article>
  );
}
