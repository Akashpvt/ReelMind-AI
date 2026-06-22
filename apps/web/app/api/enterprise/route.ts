import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

import { resolvePlatformAdmin } from "@/lib/enterprise/admin-auth";
import type { EnterpriseDashboardData, EnterpriseOrganization } from "@/lib/enterprise/types";
import { getPlanLimit, paidPlans, planLimits } from "@/lib/payments/razorpay-plans";
import { decryptToken, encryptToken } from "@/lib/secure-tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const impersonationCookie = "reelmind_enterprise_lens";
const planRevenue: Record<string, number> = { free: 0, starter: paidPlans.starter.amount, pro: paidPlans.pro.amount, agency: paidPlans.agency.amount };
const messageLimit = (plan: string) => plan === "agency" ? 10000 : plan === "pro" ? 2500 : plan === "starter" ? 500 : 100;
const countBy = (rows: Array<Record<string, unknown>>, key: string) => { const counts = new Map<string, number>(); rows.forEach(row => { const id = String(row[key] ?? ""); if (id) counts.set(id, (counts.get(id) ?? 0) + 1); }); return counts; };
const sumBy = (rows: Array<Record<string, unknown>>, key: string, value: string) => { const sums = new Map<string, number>(); rows.forEach(row => { const id = String(row[key] ?? ""); if (id) sums.set(id, (sums.get(id) ?? 0) + Number(row[value] ?? 0)); }); return sums; };

async function audit(input: { actorId: string; actorRole: string; organizationId?: string | null; action: string; reason?: string | null; metadata?: Record<string, unknown> }) {
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  await createAdminClient().from("enterprise_audit_logs").insert({ actor_id: input.actorId, actor_role: input.actorRole, organization_id: input.organizationId ?? null, action: input.action, target_type: input.organizationId ? "organization" : "platform", target_id: input.organizationId ?? null, reason: input.reason ?? null, metadata: input.metadata ?? {}, ip_address: forwarded || null, user_agent: requestHeaders.get("user-agent") });
}

async function currentLens(userId: string) {
  const store = await cookies(); const value = store.get(impersonationCookie)?.value; if (!value) return null;
  try { const payload = JSON.parse(decryptToken(value) ?? "null") as { adminId: string; organizationId: string; organizationName: string; expiresAt: string } | null; if (!payload || payload.adminId !== userId || new Date(payload.expiresAt).getTime() <= Date.now()) return null; return payload; } catch { return null; }
}

export async function GET() {
  const access = await resolvePlatformAdmin();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const admin = createAdminClient();
  const [organizationsResult, subscriptionsResult, membersResult, projectsResult, leadsResult, generationsResult, filesResult, messagesResult, limitsResult, profilesResult, logsResult] = await Promise.all([
    admin.from("organizations").select("id,owner_id,name,slug,status,suspension_reason,created_at").order("created_at", { ascending: false }),
    admin.from("organization_subscriptions").select("organization_id,plan_name,status"),
    admin.from("organization_members").select("organization_id,user_id,status").eq("status", "active"),
    admin.from("client_projects").select("organization_id"), admin.from("leads").select("organization_id"),
    admin.from("ai_generations").select("organization_id"), admin.from("project_files").select("organization_id,file_size"),
    admin.from("project_messages").select("organization_id"), admin.from("organization_limits").select("organization_id,max_users,max_projects,max_leads,max_ai_generations,max_storage_bytes,max_monthly_messages,custom_limits"),
    admin.from("profiles").select("id,email,full_name"), admin.from("enterprise_audit_logs").select("id,action,actor_role,organization_id,reason,metadata,created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const firstError = [organizationsResult, subscriptionsResult, membersResult, projectsResult, leadsResult, generationsResult, filesResult, messagesResult, limitsResult].find(result => result.error)?.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });
  const subscriptions = new Map((subscriptionsResult.data ?? []).map(row => [row.organization_id, row]));
  const profiles = new Map((profilesResult.data ?? []).map(row => [row.id, row]));
  const limits = new Map((limitsResult.data ?? []).map(row => [row.organization_id, row]));
  const memberCounts = countBy((membersResult.data ?? []) as Array<Record<string, unknown>>, "organization_id");
  const projectCounts = countBy((projectsResult.data ?? []) as Array<Record<string, unknown>>, "organization_id");
  const leadCounts = countBy((leadsResult.data ?? []) as Array<Record<string, unknown>>, "organization_id");
  const generationCounts = countBy((generationsResult.data ?? []) as Array<Record<string, unknown>>, "organization_id");
  const messageCounts = countBy((messagesResult.data ?? []) as Array<Record<string, unknown>>, "organization_id");
  const storageSums = sumBy((filesResult.data ?? []) as Array<Record<string, unknown>>, "organization_id", "file_size");
  const usageRows = (organizationsResult.data ?? []).map(org => ({ organization_id: org.id, active_users: memberCounts.get(org.id) ?? 0, projects_count: projectCounts.get(org.id) ?? 0, leads_count: leadCounts.get(org.id) ?? 0, ai_generations: generationCounts.get(org.id) ?? 0, storage_bytes: storageSums.get(org.id) ?? 0, messages_count: messageCounts.get(org.id) ?? 0, last_calculated_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  if (usageRows.length) await admin.from("organization_usage").upsert(usageRows, { onConflict: "organization_id" });
  const organizations: EnterpriseOrganization[] = (organizationsResult.data ?? []).map(org => { const subscription = subscriptions.get(org.id); const plan = subscription?.plan_name ?? "free"; const owner = profiles.get(org.owner_id); const limit = limits.get(org.id); const defaults = planLimits(plan); const custom = limit?.custom_limits ?? false; return { id: org.id, name: org.name, slug: org.slug, ownerId: org.owner_id, ownerName: owner?.full_name ?? owner?.email ?? "Unknown owner", ownerEmail: owner?.email ?? "", status: org.status, suspensionReason: org.suspension_reason, createdAt: org.created_at, plan, subscriptionStatus: subscription?.status ?? "trialing", monthlyRevenue: subscription?.status === "active" ? planRevenue[plan] ?? 0 : 0, members: memberCounts.get(org.id) ?? 0, projects: projectCounts.get(org.id) ?? 0, leads: leadCounts.get(org.id) ?? 0, aiGenerations: generationCounts.get(org.id) ?? 0, storageBytes: storageSums.get(org.id) ?? 0, messages: messageCounts.get(org.id) ?? 0, limits: { maxUsers: custom ? limit?.max_users ?? defaults.teamMembers : defaults.teamMembers, maxProjects: custom ? limit?.max_projects ?? defaults.projects : defaults.projects, maxLeads: custom ? limit?.max_leads ?? defaults.leads : defaults.leads, maxAiGenerations: custom ? limit?.max_ai_generations ?? getPlanLimit(plan) : getPlanLimit(plan), maxStorageBytes: custom ? Number(limit?.max_storage_bytes ?? defaults.fileStorageMb * 1024 * 1024) : defaults.fileStorageMb * 1024 * 1024, maxMonthlyMessages: custom ? limit?.max_monthly_messages ?? messageLimit(plan) : messageLimit(plan), custom } }; });
  const mrr = organizations.reduce((sum, org) => sum + org.monthlyRevenue, 0);
  const regular = await createClient(); const { data: isolation } = await regular.rpc("verify_tenant_isolation");
  const lens = await currentLens(access.user.id);
  const payload: EnterpriseDashboardData = { role: access.role, metrics: { mrr, arr: mrr * 12, activeAgencies: organizations.filter(org => org.status === "active").length, activeUsers: new Set((membersResult.data ?? []).map(row => row.user_id)).size, aiUsage: organizations.reduce((sum, org) => sum + org.aiGenerations, 0), storageBytes: organizations.reduce((sum, org) => sum + org.storageBytes, 0) }, organizations, auditLogs: (logsResult.data ?? []) as EnterpriseDashboardData["auditLogs"], isolation: (isolation ?? []) as EnterpriseDashboardData["isolation"], impersonation: lens ? { organizationId: lens.organizationId, organizationName: lens.organizationName, expiresAt: lens.expiresAt } : null };
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  const access = await resolvePlatformAdmin(); if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>; const operation = String(body.operation ?? ""); const organizationId = typeof body.organizationId === "string" ? body.organizationId : ""; const admin = createAdminClient();
  if (operation === "impersonate_end") { await audit({ actorId: access.user.id, actorRole: access.role, action: "impersonation_ended" }); const response = NextResponse.json({ success: true }); response.cookies.delete(impersonationCookie); return response; }
  if (!organizationId) return NextResponse.json({ error: "Organization is required." }, { status: 400 });
  const { data: organization } = await admin.from("organizations").select("id,name,status").eq("id", organizationId).maybeSingle(); if (!organization) return NextResponse.json({ error: "Organization not found." }, { status: 404 });
  if (operation === "impersonate_start") { const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); const response = NextResponse.json({ success: true, expiresAt }); response.cookies.set(impersonationCookie, encryptToken(JSON.stringify({ adminId: access.user.id, organizationId, organizationName: organization.name, expiresAt }))!, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/dashboard/admin", maxAge: 1800 }); await audit({ actorId: access.user.id, actorRole: access.role, organizationId, action: "impersonation_started", metadata: { expiresAt, mode: "read_only_support_lens" } }); return response; }
  if (!access.isSuperAdmin) return NextResponse.json({ error: "Super Admin access is required for this action." }, { status: 403 });
  if (operation === "suspend" || operation === "resume") { const status = operation === "suspend" ? "suspended" : "active"; const reason = String(body.reason ?? "").trim().slice(0, 500); if (operation === "suspend" && !reason) return NextResponse.json({ error: "A suspension reason is required." }, { status: 400 }); const { error } = await admin.from("organizations").update({ status, suspended_at: status === "suspended" ? new Date().toISOString() : null, suspended_by: status === "suspended" ? access.user.id : null, suspension_reason: status === "suspended" ? reason : null, updated_at: new Date().toISOString() }).eq("id", organizationId); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); await audit({ actorId: access.user.id, actorRole: access.role, organizationId, action: `organization_${operation}d`, reason }); return NextResponse.json({ success: true }); }
  if (operation === "update_limits") { const values = { max_users: Number(body.maxUsers), max_projects: Number(body.maxProjects), max_leads: Number(body.maxLeads), max_ai_generations: Number(body.maxAiGenerations), max_storage_bytes: Number(body.maxStorageBytes), max_monthly_messages: Number(body.maxMonthlyMessages) }; if (Object.values(values).some(value => !Number.isFinite(value) || value < 0)) return NextResponse.json({ error: "Limits must be non-negative numbers." }, { status: 400 }); const { error } = await admin.from("organization_limits").upsert({ organization_id: organizationId, ...values, custom_limits: true, updated_by: access.user.id, updated_at: new Date().toISOString() }, { onConflict: "organization_id" }); if (error) return NextResponse.json({ error: error.message }, { status: 500 }); await audit({ actorId: access.user.id, actorRole: access.role, organizationId, action: "organization_limits_updated", metadata: values }); return NextResponse.json({ success: true }); }
  return NextResponse.json({ error: "Unsupported operation." }, { status: 400 });
}
