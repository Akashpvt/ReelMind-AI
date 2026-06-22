import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeTeam = await resolveActiveTeam(user.id);
  if (!activeTeam) return NextResponse.json({ error: "No active organization found." }, { status: 403 });

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("organization_id", activeTeam.organization.id)
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminSupabase.from("team_activity_logs").insert({
    organization_id: activeTeam.organization.id,
    user_id: user.id,
    action: "notification_read",
    metadata: { all: true },
  });

  return NextResponse.json({ success: true });
}
