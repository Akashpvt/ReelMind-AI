import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasPermission, type Permission } from "@/lib/team/permissions";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export async function resolvePermission(permission: Permission, organizationId?: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const team = await resolveActiveTeam(user.id, organizationId);
  if (!team) return { ok: false as const, status: 403, error: "An active workspace membership is required." };
  if (!hasPermission(team.membership.role, permission)) return { ok: false as const, status: 403, error: "Your role does not allow this action." };
  return { ok: true as const, user, team, organizationId: team.organization.id, role: team.membership.role };
}

export async function requirePagePermission(permission: Permission, nextPath: string) {
  const access = await resolvePermission(permission);
  if (!access.ok && access.status === 401) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  if (!access.ok) redirect("/dashboard/team?error=forbidden");
  return access;
}

export function permissionError(access: { ok: false; status: number; error: string }) {
  return NextResponse.json({ error: access.error }, { status: access.status });
}
