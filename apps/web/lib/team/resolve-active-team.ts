import { createClient } from "@/lib/supabase/server";

export type ResolvedOrganization = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  created_at: string;
  status: "active" | "suspended" | "closed";
};

export type ResolvedMembership = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  invited_by: string | null;
  joined_at: string;
};

export async function resolveActiveTeam(userId: string, requestedOrganizationId?: string | null) {
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("id,organization_id,user_id,role,status,invited_by,joined_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  const membershipRows = (memberships ?? []) as ResolvedMembership[];
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
      .eq("owner_id", userId)
      .eq("status", "active"),
  ]);

  const organizationById = new Map<string, ResolvedOrganization>();
  [...((memberOrganizationsResult.data ?? []) as ResolvedOrganization[]), ...((ownedOrganizationsResult.data ?? []) as ResolvedOrganization[])]
    .forEach((organization) => organizationById.set(organization.id, organization));

  const memberTeams = membershipRows.flatMap((membership) => {
    const organization = organizationById.get(membership.organization_id);
    return organization ? [{ membership, organization }] : [];
  });
  const ownerTeams = ((ownedOrganizationsResult.data ?? []) as ResolvedOrganization[])
    .filter((organization) => !memberTeams.some((team) => team.organization.id === organization.id))
    .map((organization) => ({
      membership: {
        id: `${organization.id}-${userId}`,
        organization_id: organization.id,
        user_id: userId,
        role: "owner",
        status: "active",
        invited_by: null,
        joined_at: organization.created_at,
      },
      organization,
    }));

  const teams = [...memberTeams, ...ownerTeams];
  return requestedOrganizationId
    ? teams.find((team) => team.organization.id === requestedOrganizationId) ?? null
    : teams[0] ?? null;
}
