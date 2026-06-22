import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationSubscription, getOrganizationUsage, isSubscriptionPlan, planRank } from "@/lib/billing/subscription";
import { planLimits } from "@/lib/payments/razorpay-plans";
import { createNotificationsForUsers } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const planId = body.planId;
  if (!organizationId || !isSubscriptionPlan(planId)) {
    return NextResponse.json({ error: "organizationId and valid planId are required." }, { status: 400 });
  }

  const activeTeam = await resolveActiveTeam(user.id, organizationId);
  if (!activeTeam || (activeTeam.membership.role !== "owner" && activeTeam.membership.role !== "admin")) {
    return NextResponse.json({ error: "Only owners and admins can manage billing." }, { status: 403 });
  }

  const current = await getOrganizationSubscription(organizationId, user.id);
  if (planRank(planId) > planRank(current.plan_name)) {
    return NextResponse.json({ error: "Paid upgrades must go through Razorpay checkout." }, { status: 400 });
  }

  const usage = await getOrganizationUsage(organizationId);
  const limits = planLimits(planId);
  const overLimit = (Object.keys(limits) as Array<keyof typeof limits>).find((key) => usage[key] > limits[key]);
  if (overLimit) {
    return NextResponse.json({ error: `Cannot downgrade: ${overLimit} usage exceeds ${planId} limit.`, upgradeRequired: true }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: subscription, error } = await adminSupabase
    .from("organization_subscriptions")
    .upsert({
      organization_id: organizationId,
      plan_name: planId,
      status: planId === "free" ? "trialing" : "active",
      cancel_at_period_end: false,
      current_period_start: new Date().toISOString(),
      current_period_end: null,
      updated_at: new Date().toISOString(),
      created_by: user.id,
    }, { onConflict: "organization_id" })
    .select("id,organization_id,plan_name,status,trial_ends_at,current_period_start,current_period_end,cancel_at_period_end,created_by,created_at,updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminSupabase.from("team_activity_logs").insert({
    organization_id: organizationId,
    user_id: user.id,
    action: "subscription_updated",
    metadata: { planId, previousPlan: current.plan_name, mode: "manual_change" },
  });

  const { data: members } = await adminSupabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("status", "active");
  await createNotificationsForUsers({
    organizationId,
    userIds: ((members ?? []) as Array<{ user_id: string }>).map((member) => member.user_id),
    type: "subscription_updated",
    title: "Subscription changed",
    message: `Workspace plan changed to ${planId}.`,
  });

  return NextResponse.json({ success: true, subscription });
}
