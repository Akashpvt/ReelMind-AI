import "server-only";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlatformAdminRole = "super_admin" | "support_admin";

export async function resolvePlatformAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: "Unauthorized" };
  const admin = createAdminClient();
  const { data: record } = await admin.from("platform_admins").select("id,user_id,role,status").eq("user_id", user.id).eq("status", "active").maybeSingle();
  let role = record?.role as PlatformAdminRole | undefined;
  const bootstrapEmails = (process.env.SUPER_ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  if (!role && user.email && bootstrapEmails.includes(user.email.toLowerCase())) {
    const { data } = await admin.from("platform_admins").upsert({ user_id: user.id, role: "super_admin", status: "active", updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select("role").single();
    role = data?.role as PlatformAdminRole | undefined;
  }
  if (!role) return { ok: false as const, status: 403, error: "Platform administrator access is required." };
  return { ok: true as const, user, role, isSuperAdmin: role === "super_admin" };
}

export async function requirePlatformAdminPage() {
  const access = await resolvePlatformAdmin();
  if (!access.ok && access.status === 401) redirect("/login?next=/dashboard/admin");
  if (!access.ok) redirect("/dashboard?error=platform_admin_required");
  return access;
}
