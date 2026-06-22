import { InviteMemberForm, MemberControls } from "@/components/team/team-actions";
import { ListCard, Row, TeamShell } from "@/components/team/team-shell";
import { loadTeamData } from "@/lib/team/load-team-data";
import { canManageMembers, roleBadgeClass, roleLabel } from "@/lib/team/permissions";
import { requirePagePermission } from "@/lib/team/permission-guards";

export const dynamic = "force-dynamic";

export default async function TeamMembersPage() {
  await requirePagePermission("members:manage", "/dashboard/team/members");
  const { activeTeam, members, invites } = await loadTeamData();
  const role = activeTeam?.role ?? null;
  const organization = activeTeam?.organization;

  return (
    <TeamShell title="Members" subtitle="Invite teammates, review roles, remove members, and adjust permissions.">
      <InviteMemberForm organizationId={organization?.id} canInvite={canManageMembers(role)} />
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListCard title="Member List" empty="Create an organization to add members.">
          {members.map((member) => (
            <article key={member.id} className="rounded-2xl border border-white/10 bg-ink/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {member.profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.profile.avatar_url} alt="" className="h-10 w-10 rounded-full border border-white/10 object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cyberBlue/20 bg-cyberBlue/[0.08] text-sm font-semibold text-cyberBlue">
                      {member.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-frost">{member.displayName}</p>
                    <p className="mt-1 truncate text-xs text-mist">{member.displayEmail}</p>
                    <p className="mt-1 text-xs text-mist">{member.status} / joined {new Date(member.joined_at).toLocaleString()}</p>
                  </div>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${roleBadgeClass(member.role)}`}>{roleLabel(member.role)}</span>
              </div>
              <MemberControls organizationId={organization?.id} memberId={member.id} currentRole={member.role} canManage={canManageMembers(role)} />
            </article>
          ))}
        </ListCard>
        <ListCard title="Pending Invites" empty="No pending invitations.">
          {invites.map((invite) => (
            <Row
              key={invite.id}
              title={`${invite.email} / ${roleLabel(invite.role)}`}
              detail={`${invite.status} / expires ${new Date(invite.expires_at).toLocaleString()} / token ${invite.invite_token}`}
            />
          ))}
        </ListCard>
      </section>
    </TeamShell>
  );
}
