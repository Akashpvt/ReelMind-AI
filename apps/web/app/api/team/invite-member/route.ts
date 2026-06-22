import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { assertWithinPlanLimit } from "@/lib/billing/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTeamRole } from "@/lib/team/permissions";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type OrganizationRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  created_at: string;
};

type MembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  role: string;
  status: string;
  invited_by: string | null;
  joined_at: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { organizationId?: unknown; email?: unknown; role?: unknown };
  const requestedOrganizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role;

  if (!email || !isTeamRole(role) || role === "owner") {
    return NextResponse.json({ error: "Valid email and non-owner role are required." }, { status: 400 });
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("id,organization_id,user_id,role,status,invited_by,joined_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("joined_at", { ascending: true });

  const membershipRows = (memberships ?? []) as MembershipRow[];
  const membershipOrgIds = membershipRows.map((membership) => membership.organization_id);
  const [memberOrganizationsResult, ownedOrganizationsResult] = await Promise.all([
    membershipOrgIds.length
      ? supabase
          .from("organizations")
          .select("id,owner_id,name,slug,created_at")
          .in("id", membershipOrgIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("organizations")
      .select("id,owner_id,name,slug,created_at")
      .eq("owner_id", user.id),
  ]);

  const organizationById = new Map<string, OrganizationRow>();
  [...((memberOrganizationsResult.data ?? []) as OrganizationRow[]), ...((ownedOrganizationsResult.data ?? []) as OrganizationRow[])]
    .forEach((organization) => organizationById.set(organization.id, organization));

  const memberTeams = membershipRows.flatMap((membership) => {
    const organization = organizationById.get(membership.organization_id);
    return organization ? [{ membership, organization }] : [];
  });
  const ownerTeams = ((ownedOrganizationsResult.data ?? []) as OrganizationRow[])
    .filter((organization) => !memberTeams.some((team) => team.organization.id === organization.id))
    .map((organization) => ({
      membership: {
        id: `${organization.id}-${user.id}`,
        organization_id: organization.id,
        user_id: user.id,
        role: "owner",
        status: "active",
        invited_by: null,
        joined_at: organization.created_at,
      },
      organization,
    }));
  const teams = [...memberTeams, ...ownerTeams];
  const activeTeam = requestedOrganizationId
    ? teams.find((team) => team.organization.id === requestedOrganizationId)
    : teams[0];

  if (!activeTeam) {
    return NextResponse.json({ error: "Create an organization before inviting members." }, { status: 400 });
  }

  const organizationId = activeTeam.organization.id;
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id,organization_id,user_id,role,status,invited_by,joined_at")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const requesterMembership = (membership ?? activeTeam.membership) as MembershipRow;
  const isOwnerFallback = activeTeam.organization.owner_id === user.id;
  const canInvite = ["owner", "admin"].includes(requesterMembership.role) || isOwnerFallback;

  if (process.env.NODE_ENV !== "production") {
    console.log("Team invite permission check", {
      userId: user.id,
      organizationId,
      role: requesterMembership.role,
      status: requesterMembership.status,
      ownerFallback: isOwnerFallback,
    });
  }

  if (!canInvite) {
    return NextResponse.json({ error: "Only owners and admins can invite members." }, { status: 403 });
  }

  const limitCheck = await assertWithinPlanLimit(organizationId, "teamMembers");
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.error, upgradeRequired: true }, { status: 402 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required to create team invitations." },
      { status: 500 },
    );
  }

  const adminSupabase = createAdminClient();
  const inviteToken = randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitation, error } = await adminSupabase
    .from("organization_invites")
    .insert({
      invite_token: inviteToken,
      organization_id: organizationId,
      email,
      role,
      invited_by: user.id,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id,organization_id,email,role,invite_token,expires_at,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("team_activity_logs").insert({
    organization_id: organizationId,
    user_id: user.id,
    action: "member_invited",
    metadata: { email, role },
  });

  return NextResponse.json({ success: true, invitation });
}
