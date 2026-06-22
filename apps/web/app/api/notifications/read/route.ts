import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const notificationId = typeof body.notificationId === "string" ? body.notificationId : "";
  if (!notificationId) return NextResponse.json({ error: "notificationId is required." }, { status: 400 });

  const activeTeam = await resolveActiveTeam(user.id);
  if (!activeTeam) return NextResponse.json({ error: "No active organization found." }, { status: 403 });

  const adminSupabase = createAdminClient();
  const { data: notification, error } = await adminSupabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("organization_id", activeTeam.organization.id)
    .eq("user_id", user.id)
    .select("id,organization_id,user_id,project_id,title,message,type,is_read,created_at")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!notification) return NextResponse.json({ success: true, notification: null });

  await adminSupabase.from("team_activity_logs").insert({
    organization_id: activeTeam.organization.id,
    user_id: user.id,
    action: "notification_read",
    metadata: { notificationId },
  });

  return NextResponse.json({ success: true, notification });
}
