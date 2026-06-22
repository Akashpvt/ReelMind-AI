import { NextResponse } from "next/server";
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

  const body = (await request.json().catch(() => ({}))) as { organizationId?: unknown; memberId?: unknown };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!organizationId || !memberId) {
    return NextResponse.json({ error: "Organization and member are required." }, { status: 400 });
  }

  const { data: requesterRole } = await supabase.rpc("current_org_role", { target_organization_id: organizationId });
  if (requesterRole !== "owner" && requesterRole !== "admin") {
    return NextResponse.json({ error: "Only owners and admins can remove members." }, { status: 403 });
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("role,user_id")
    .eq("id", memberId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const target = member as { role?: string; user_id?: string } | null;
  if (!target || target.role === "owner") {
    return NextResponse.json({ error: "Owner members cannot be removed from this action." }, { status: 400 });
  }

  const { error } = await supabase
    .from("organization_members")
    .update({ status: "removed" })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("team_activity_logs").insert({
    organization_id: organizationId,
    user_id: user.id,
    action: "member_removed",
    metadata: { removedUserId: target.user_id },
  });

  return NextResponse.json({ success: true });
}
