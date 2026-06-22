import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    console.info("[api/notifications/list] auth", {
      userId: user?.id ?? null,
      userError,
    });

    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0, error: "Unauthorized" }, { status: 401 });
    }

    const requestedOrganizationId = new URL(request.url).searchParams.get("organizationId");
    const activeTeam = await resolveActiveTeam(user.id, requestedOrganizationId);

    console.info("[api/notifications/list] active organization", {
      userId: user.id,
      requestedOrganizationId,
      activeOrganizationId: activeTeam?.organization.id ?? null,
    });

    if (!activeTeam) {
      return NextResponse.json({ notifications: [], unreadCount: 0, error: "No active organization found." }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { data: notifications, error } = await adminSupabase
      .from("notifications")
      .select("id,organization_id,user_id,project_id,title,message,type,is_read,created_at")
      .eq("organization_id", activeTeam.organization.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);

    console.info("[api/notifications/list] query result", {
      userId: user.id,
      activeOrganizationId: activeTeam.organization.id,
      notificationCount: notifications?.length ?? 0,
      notifications,
      error,
    });

    if (error) {
      console.error("[api/notifications/list] query error", {
        userId: user.id,
        activeOrganizationId: activeTeam.organization.id,
        error,
      });
      return NextResponse.json({ notifications: [], unreadCount: 0, error: null });
    }

    const rows = notifications ?? [];
    return NextResponse.json({
      notifications: rows,
      unreadCount: rows.filter((notification) => !notification.is_read).length,
      error: null,
    });
  } catch (error) {
    console.error("[api/notifications/list] unhandled error", { error });
    return NextResponse.json({ notifications: [], unreadCount: 0, error: null });
  }
}
