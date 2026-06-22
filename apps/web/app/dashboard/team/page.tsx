import Link from "next/link";
import { AcceptInviteForm, CreateClientProjectForm, CreateOrganizationForm, EmailNotificationsForm, InviteMemberForm } from "@/components/team/team-actions";
import { ListCard, Metric, Row, TeamShell } from "@/components/team/team-shell";
import { canManageMembers, canManageProjects, roleBadgeClass, roleLabel } from "@/lib/team/permissions";
import { loadTeamData } from "@/lib/team/load-team-data";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function TeamDashboardPage() {
  const { activeTeam, teams, members, invites, projects, activity, analytics } = await loadTeamData();
  const role = activeTeam?.role ?? null;
  const organization = activeTeam?.organization;
  const adminSupabase = createAdminClient();
  const { data: settings } = organization?.id
    ? await adminSupabase
      .from("organization_settings")
      .select("email_notifications_enabled")
      .eq("organization_id", organization.id)
      .maybeSingle()
    : { data: null };
  const emailNotificationsEnabled = settings?.email_notifications_enabled ?? true;

  return (
    <TeamShell title="Team & Agency" subtitle="Multi-user agency workspace with roles, client projects, shared analytics, and collaboration history.">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Organization</p>
              <h1 className="mt-2 text-3xl font-semibold text-frost">{organization?.name ?? "No organization yet"}</h1>
              <p className="mt-2 text-sm text-mist">
                {organization ? `Workspace slug: ${organization.slug}` : "Create an organization or accept an invite to begin."}
              </p>
            </div>
            {role ? <span className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClass(role)}`}>{roleLabel(role)}</span> : null}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Metric label="Total Members" value={analytics.totalMembers} detail="organization seats" />
            <Metric label="Active Projects" value={analytics.activeProjects} detail="client work" />
            <Metric label="Credits Consumed" value={analytics.creditsConsumed} detail="your generation usage" />
            <Metric label="Generated Videos" value={analytics.generatedVideos} detail="video renders" />
            <Metric label="Generated Thumbnails" value={analytics.generatedThumbnails} detail="thumbnail assets" />
            <Metric label="Generated Voiceovers" value={analytics.generatedVoiceovers} detail="voice assets" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/team/members" className="rounded-full border border-cyberBlue/30 px-4 py-2 text-sm font-medium text-cyberBlue transition hover:bg-cyberBlue hover:text-ink">
              Members
            </Link>
            <Link href="/dashboard/team/projects" className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-frost transition hover:border-cyberBlue/40">
              Projects
            </Link>
            <Link href="/dashboard/team/activity" className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-frost transition hover:border-cyberBlue/40">
              Activity
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          <CreateOrganizationForm />
          <AcceptInviteForm />
          <EmailNotificationsForm organizationId={organization?.id} canManage={canManageMembers(role)} initialEnabled={emailNotificationsEnabled} />
        </div>
      </div>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <InviteMemberForm organizationId={organization?.id} canInvite={canManageMembers(role)} />
        <CreateClientProjectForm organizationId={organization?.id} canCreate={canManageProjects(role)} />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListCard title="Members" empty="Create an organization to invite members.">
          {members.slice(0, 6).map((member) => (
            <Row key={member.id} title={`${member.displayName} / ${roleLabel(member.role)}`} detail={`${member.displayEmail} / ${member.status} / joined ${new Date(member.joined_at).toLocaleString()}`} />
          ))}
        </ListCard>
        <ListCard title="Clients" empty="Client projects will appear here.">
          {projects.slice(0, 6).map((project) => (
            <Row key={project.id} title={project.project_title} detail={`${project.status} / ${new Date(project.created_at).toLocaleString()}`} />
          ))}
        </ListCard>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListCard title="Pending Invitations" empty="No pending invitations.">
          {invites.slice(0, 6).map((invite) => (
            <Row key={invite.id} title={`${invite.email} / ${roleLabel(invite.role)}`} detail={`Expires ${new Date(invite.expires_at).toLocaleString()} / token ${invite.invite_token}`} />
          ))}
        </ListCard>
        <ListCard title="Activity Timeline" empty="Team activity appears after members collaborate.">
          {activity.slice(0, 6).map((entry) => (
            <Row key={entry.id} title={entry.action.replaceAll("_", " ")} detail={new Date(entry.created_at).toLocaleString()} />
          ))}
        </ListCard>
      </section>

      <p className="mt-5 text-xs leading-5 text-mist">
        Available workspaces: {teams.length}. Client role users can view assigned client projects only through RLS.
      </p>
    </TeamShell>
  );
}
