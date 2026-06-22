import { createAdminClient } from "@/lib/supabase/admin";
import { freePlan, paidPlans, planLimits, type PlanId } from "@/lib/payments/razorpay-plans";

export type OrganizationSubscription = {
  id: string;
  organization_id: string;
  plan_name: PlanId;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageSnapshot = {
  leads: number;
  projects: number;
  teamMembers: number;
  fileStorageMb: number;
};

export function isSubscriptionPlan(value: unknown): value is PlanId {
  return value === "free" || value === "starter" || value === "pro" || value === "agency";
}

export function isPaidSubscriptionPlan(value: unknown): value is keyof typeof paidPlans {
  return value === "starter" || value === "pro" || value === "agency";
}

export async function getOrganizationSubscription(organizationId: string, createdBy?: string | null) {
  const adminSupabase = createAdminClient();
  const { data: existing } = await adminSupabase
    .from("organization_subscriptions")
    .select("id,organization_id,plan_name,status,trial_ends_at,current_period_start,current_period_end,cancel_at_period_end,razorpay_order_id,razorpay_payment_id,created_by,created_at,updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (existing) return existing as OrganizationSubscription;

  const { data } = await adminSupabase
    .from("organization_subscriptions")
    .insert({
      organization_id: organizationId,
      plan_name: freePlan.id,
      status: "trialing",
      created_by: createdBy ?? null,
    })
    .select("id,organization_id,plan_name,status,trial_ends_at,current_period_start,current_period_end,cancel_at_period_end,razorpay_order_id,razorpay_payment_id,created_by,created_at,updated_at")
    .single();
  return data as OrganizationSubscription;
}

export async function getOrganizationUsage(organizationId: string): Promise<UsageSnapshot> {
  const adminSupabase = createAdminClient();
  const [leadsResult, projectsResult, membersResult, filesResult] = await Promise.all([
    adminSupabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    adminSupabase.from("client_projects").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    adminSupabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).eq("status", "active"),
    adminSupabase.from("project_files").select("file_size").eq("organization_id", organizationId),
  ]);
  const bytes = ((filesResult.data ?? []) as Array<{ file_size: number | null }>).reduce((sum, file) => sum + Number(file.file_size ?? 0), 0);
  return {
    leads: leadsResult.count ?? 0,
    projects: projectsResult.count ?? 0,
    teamMembers: membersResult.count ?? 0,
    fileStorageMb: Math.ceil(bytes / 1024 / 1024),
  };
}

export async function assertWithinPlanLimit(organizationId: string, metric: keyof UsageSnapshot, increment = 1) {
  const subscription = await getOrganizationSubscription(organizationId);
  const adminSupabase = createAdminClient();
  const { data: enterpriseLimits } = await adminSupabase
    .from("organization_limits")
    .select("max_users,max_projects,max_leads,max_storage_bytes,custom_limits")
    .eq("organization_id", organizationId)
    .maybeSingle();
  const planDefaults = planLimits(subscription.plan_name);
  const limits = enterpriseLimits?.custom_limits ? {
    leads: enterpriseLimits.max_leads,
    projects: enterpriseLimits.max_projects,
    teamMembers: enterpriseLimits.max_users,
    fileStorageMb: Math.floor(Number(enterpriseLimits.max_storage_bytes) / 1024 / 1024),
  } : planDefaults;
  const usage = await getOrganizationUsage(organizationId);
  const nextValue = usage[metric] + increment;
  const limit = limits[metric];
  if (nextValue > limit) {
    return {
      ok: false as const,
      error: `Plan limit reached for ${metric}. Current plan allows ${limit}.`,
      subscription,
      usage,
      limit,
    };
  }
  return { ok: true as const, subscription, usage, limit };
}

export function planRank(planName: string) {
  if (planName === "agency") return 3;
  if (planName === "pro") return 2;
  if (planName === "starter") return 1;
  return 0;
}
