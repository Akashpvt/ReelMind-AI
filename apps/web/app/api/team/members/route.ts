import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = new URL(request.url).searchParams.get("organizationId");
  let membershipsQuery = supabase
    .from("organization_members")
    .select("id,role,status,joined_at,organization:organizations(id,owner_id,name,slug,created_at)")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (organizationId) {
    membershipsQuery = membershipsQuery.eq("organization_id", organizationId);
  }

  const { data: memberships, error: membershipsError } = await membershipsQuery;
  if (membershipsError) {
    return NextResponse.json({ error: membershipsError.message }, { status: 500 });
  }

  const orgIds = ((memberships ?? []) as Array<{ organization?: { id?: string } | Array<{ id?: string }> | null }>)
    .map((membership) => {
      const organization = Array.isArray(membership.organization) ? membership.organization[0] : membership.organization;
      return organization?.id;
    })
    .filter((id): id is string => Boolean(id));

  if (!orgIds.length) {
    return NextResponse.json({ organizations: [], members: [], invitations: [], projects: [] });
  }

  const [membersResult, invitesResult, projectsResult] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id,organization_id,user_id,role,status,invited_by,joined_at")
      .in("organization_id", orgIds)
      .neq("status", "removed")
      .order("joined_at", { ascending: true }),
    supabase
      .from("organization_invites")
      .select("id,organization_id,email,role,invite_token,expires_at,created_at")
      .in("organization_id", orgIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_projects")
      .select("id,organization_id,client_name,client_email,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
      .in("organization_id", orgIds)
      .order("created_at", { ascending: false }),
  ]);

  const error = membersResult.error ?? invitesResult.error ?? projectsResult.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    organizations: memberships ?? [],
    members: membersResult.data ?? [],
    invitations: invitesResult.data ?? [],
    projects: projectsResult.data ?? [],
  });
}
