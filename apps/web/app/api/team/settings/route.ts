import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionError, resolvePermission } from "@/lib/team/permission-guards";

const hexPattern = /^#[0-9a-f]{6}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const domainPattern = /^(?=.{4,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await resolvePermission("workspace:read", organizationId);
  if (!access.ok) return permissionError(access);
  const admin = createAdminClient();
  const { data } = await admin.from("organization_settings").select("agency_name,logo_url,primary_color,support_email,custom_footer,custom_domain,domain_status,email_notifications_enabled,session_timeout_minutes").eq("organization_id", access.organizationId).maybeSingle();
  return NextResponse.json({ settings: data ?? {}, canManage: ["owner", "admin"].includes(access.role) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const organizationId = clean(body.organizationId, 64);
  const access = await resolvePermission("settings:manage", organizationId);
  if (!access.ok) return permissionError(access);

  const agencyName = clean(body.agencyName, 120);
  const primaryColor = clean(body.primaryColor, 7);
  const supportEmail = clean(body.supportEmail, 254).toLowerCase();
  const customFooter = clean(body.customFooter, 300);
  const customDomain = clean(body.customDomain, 253).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const sessionTimeoutMinutes = Number(body.sessionTimeoutMinutes ?? 1440);
  if (!agencyName || !hexPattern.test(primaryColor) || (supportEmail && !emailPattern.test(supportEmail)) || (customDomain && !domainPattern.test(customDomain)) || !Number.isInteger(sessionTimeoutMinutes) || sessionTimeoutMinutes < 15 || sessionTimeoutMinutes > 10080) {
    return NextResponse.json({ error: "One or more workspace settings are invalid." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: previous } = await admin.from("organization_settings").select("agency_name,logo_url,primary_color,support_email,custom_footer,custom_domain,session_timeout_minutes,email_notifications_enabled").eq("organization_id", organizationId).maybeSingle();
  const next = { organization_id: organizationId, agency_name: agencyName, primary_color: primaryColor.toUpperCase(), support_email: supportEmail || null, custom_footer: customFooter || null, custom_domain: customDomain || null, domain_status: customDomain === previous?.custom_domain ? undefined : "unverified", session_timeout_minutes: sessionTimeoutMinutes, email_notifications_enabled: previous?.email_notifications_enabled ?? true, updated_at: new Date().toISOString() };
  const values = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
  const { data: settings, error } = await admin.from("organization_settings").upsert(values, { onConflict: "organization_id" }).select("agency_name,logo_url,primary_color,support_email,custom_footer,custom_domain,domain_status,email_notifications_enabled,session_timeout_minutes").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("team_activity_logs").insert({ organization_id: organizationId, user_id: access.user.id, action: "branding_updated", metadata: { changedFields: Object.keys(values).filter((key) => key !== "organization_id" && key !== "updated_at"), previousDomain: previous?.custom_domain ?? null, customDomain: customDomain || null } });
  return NextResponse.json({ settings });
}
