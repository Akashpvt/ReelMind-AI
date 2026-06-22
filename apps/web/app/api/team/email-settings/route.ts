import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

function canManageSettings(role?: string | null) {
  return role === "owner" || role === "admin";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const activeTeam = await resolveActiveTeam(user.id, organizationId);
  if (!activeTeam) return NextResponse.json({ error: "No active organization found." }, { status: 403 });

  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("organization_settings")
    .select("email_notifications_enabled")
    .eq("organization_id", activeTeam.organization.id)
    .maybeSingle();

  return NextResponse.json({
    emailNotificationsEnabled: data?.email_notifications_enabled ?? true,
    canManage: canManageSettings(activeTeam.membership.role),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : null;
  const enabled = typeof body.emailNotificationsEnabled === "boolean" ? body.emailNotificationsEnabled : null;
  if (enabled === null) return NextResponse.json({ error: "emailNotificationsEnabled is required." }, { status: 400 });

  const activeTeam = await resolveActiveTeam(user.id, organizationId);
  if (!activeTeam) return NextResponse.json({ error: "No active organization found." }, { status: 403 });
  if (!canManageSettings(activeTeam.membership.role)) {
    return NextResponse.json({ error: "Only owners and admins can update email settings." }, { status: 403 });
  }

  const adminSupabase = createAdminClient();
  const { data, error } = await adminSupabase
    .from("organization_settings")
    .upsert({
      organization_id: activeTeam.organization.id,
      email_notifications_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .select("organization_id,email_notifications_enabled,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminSupabase.from("team_activity_logs").insert({
    organization_id: activeTeam.organization.id,
    user_id: user.id,
    action: "email_settings_updated",
    metadata: { emailNotificationsEnabled: enabled },
  });

  return NextResponse.json({ success: true, settings: data });
}
