import { NextResponse } from "next/server";
import { isTeamRole } from "@/lib/team/permissions";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { organizationId?: unknown; memberId?: unknown; role?: unknown };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  const role = body.role;
  if (!organizationId || !memberId || !isTeamRole(role) || role === "owner") {
    return NextResponse.json({ error: "Organization, member, and non-owner role are required." }, { status: 400 });
  }

  const { data: requesterRole } = await supabase.rpc("current_org_role", { target_organization_id: organizationId });
  if (requesterRole !== "owner" && requesterRole !== "admin") {
    return NextResponse.json({ error: "Only owners and admins can change roles." }, { status: 403 });
  }

  const { data: existingMember } = await supabase.from("organization_members").select("role").eq("id", memberId).eq("organization_id", organizationId).maybeSingle();
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .neq("role", "owner");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("team_activity_logs").insert({
    organization_id: organizationId,
    user_id: user.id,
    action: "member_role_changed",
    metadata: { memberId, previousRole: existingMember?.role ?? null, role },
  });

  return NextResponse.json({ success: true, role });
}
