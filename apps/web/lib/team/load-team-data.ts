import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ClientProject } from "@/lib/team/project-types";

export type OrganizationRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  created_at: string;
  status: "active" | "suspended" | "closed";
};

export type TeamMembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  invited_by: string | null;
  joined_at: string;
};

export type TeamMemberProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
};

export type TeamMemberRow = TeamMembershipRow & {
  profile: TeamMemberProfile | null;
  displayName: string;
  displayEmail: string;
};

export type TeamInviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
};

export type TeamActivityRow = {
  id: string;
  organization_id: string;
  project_id?: string;
  user_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

function shortUserId(userId: string) {
  return `${userId.slice(0, 8)}...`;
}

const projectSelect = "id,organization_id,client_name,client_email,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at";

export async function loadTeamData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/team");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("id,organization_id,user_id,role,status,invited_by,joined_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  const membershipRows = (memberships ?? []) as TeamMembershipRow[];
  const membershipOrgIds = membershipRows.map((membership) => membership.organization_id);
  const [memberOrganizationsResult, ownedOrganizationsResult] = await Promise.all([
    membershipOrgIds.length
      ? supabase
          .from("organizations")
          .select("id,owner_id,name,slug,created_at,status")
          .in("id", membershipOrgIds)
          .eq("status", "active")
      : Promise.resolve({ data: [] }),
    supabase
      .from("organizations")
      .select("id,owner_id,name,slug,created_at,status")
      .eq("owner_id", user.id)
      .eq("status", "active"),
  ]);

  const organizationById = new Map<string, OrganizationRow>();
  [...((memberOrganizationsResult.data ?? []) as OrganizationRow[]), ...((ownedOrganizationsResult.data ?? []) as OrganizationRow[])]
    .forEach((organization) => organizationById.set(organization.id, organization));

  const memberTeams = membershipRows.flatMap((membership) => {
    const organization = organizationById.get(membership.organization_id);
    return organization ? [{ role: membership.role, organization }] : [];
  });
  const ownerTeams = ((ownedOrganizationsResult.data ?? []) as OrganizationRow[])
    .filter((organization) => !memberTeams.some((team) => team.organization.id === organization.id))
    .map((organization) => ({ role: "owner", organization }));
  const teams = [...memberTeams, ...ownerTeams];

  const activeTeam = teams[0] ?? null;
  const organizationId = activeTeam?.organization.id;

  const [membersResult, invitesResult, projectsResult, activityResult, projectActivityResult, usageResult] = organizationId
    ? await Promise.all([
        supabase
          .from("organization_members")
          .select("id,organization_id,user_id,role,status,invited_by,joined_at")
          .eq("organization_id", organizationId)
          .neq("status", "removed")
          .order("joined_at", { ascending: true }),
        supabase
          .from("organization_invites")
          .select("id,organization_id,email,role,status,invite_token,expires_at,created_at")
          .eq("organization_id", organizationId)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("client_projects")
          .select(projectSelect)
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false }),
        supabase
          .from("team_activity_logs")
          .select("id,organization_id,user_id,action,metadata,created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("project_activity_logs")
          .select("id,organization_id,project_id,user_id,action,metadata,created_at")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("usage_analytics")
          .select("tool_name,credits_consumed,created_at")
          .eq("user_id", user.id),
      ])
    : [
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
        { data: [] },
      ];

  let rawMembers = (membersResult.data ?? []) as TeamMembershipRow[];
  if (organizationId && rawMembers.length === 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createAdminClient();
    const { data: adminMembers, error: adminMembersError } = await adminSupabase
      .from("organization_members")
      .select("id,organization_id,user_id,role,status,invited_by,joined_at")
      .eq("organization_id", organizationId)
      .neq("status", "removed")
      .order("joined_at", { ascending: true });

    if (!adminMembersError) {
      rawMembers = (adminMembers ?? []) as TeamMembershipRow[];
    }
  }
  const memberRows = rawMembers.length || !activeTeam
    ? rawMembers
    : [{
        id: `${activeTeam.organization.id}-${user.id}`,
        organization_id: activeTeam.organization.id,
        user_id: user.id,
        role: activeTeam.role,
        status: "active",
        invited_by: null,
        joined_at: activeTeam.organization.created_at,
      }];
  const memberUserIds = [...new Set(memberRows.map((member) => member.user_id))];
  const { data: profiles } = memberUserIds.length
    ? await supabase
        .from("profiles")
        .select("id,email,full_name,avatar_url")
        .in("id", memberUserIds)
    : { data: [] };
  const profileById = new Map(
    ((profiles ?? []) as TeamMemberProfile[]).map((profile) => [profile.id, profile]),
  );
  const members: TeamMemberRow[] = memberRows.map((member) => {
    const profile = profileById.get(member.user_id) ?? null;
    const fallbackEmail = member.user_id === user.id ? user.email ?? "" : "";
    const displayEmail = profile?.email || fallbackEmail || shortUserId(member.user_id);
    return {
      ...member,
      profile,
      displayName: profile?.full_name || profile?.email || fallbackEmail || shortUserId(member.user_id),
      displayEmail,
    };
  });
  const usageRows = ((usageResult.data ?? []) as Array<{ tool_name: string; credits_consumed: number }>);
  let projects = (projectsResult.data ?? []) as ClientProject[];
  if (organizationId && (projectsResult.error || projects.length === 0) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createAdminClient();
    const { data: adminProjects, error: adminProjectsError } = await adminSupabase
      .from("client_projects")
      .select(projectSelect)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (!adminProjectsError) {
      projects = (adminProjects ?? []) as ClientProject[];
    }
  }
  let pendingInvites = (invitesResult.data ?? []) as TeamInviteRow[];
  if (organizationId && pendingInvites.length === 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const adminSupabase = createAdminClient();
    const { data: adminPendingInvites, error: adminPendingInvitesError } = await adminSupabase
      .from("organization_invites")
      .select("id,organization_id,email,role,status,invite_token,expires_at,created_at")
      .eq("organization_id", organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!adminPendingInvitesError) {
      pendingInvites = (adminPendingInvites ?? []) as TeamInviteRow[];
    }
  }
  const analytics = {
    totalMembers: members.length,
    activeProjects: projects.filter((project) => project.status !== "archived").length,
    creditsConsumed: usageRows.reduce((sum, row) => sum + row.credits_consumed, 0),
    generatedVideos: usageRows.filter((row) => row.tool_name === "video_generation").length,
    generatedThumbnails: usageRows.filter((row) => row.tool_name === "thumbnail").length,
    generatedVoiceovers: usageRows.filter((row) => row.tool_name === "voiceover").length,
  };
  const activity: TeamActivityRow[] = [
    ...((activityResult.data ?? []) as TeamActivityRow[]),
    ...((projectActivityResult.data ?? []) as TeamActivityRow[]),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return {
    user,
    teams,
    activeTeam,
    members,
    invites: pendingInvites,
    projects,
    activity,
    analytics,
  };
}
