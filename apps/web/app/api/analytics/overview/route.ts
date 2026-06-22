import { NextResponse } from "next/server";
import { getOrganizationSubscription, getOrganizationUsage } from "@/lib/billing/subscription";
import { buildOverview, loadAnalyticsRows, logAnalyticsViewed, resolveAnalyticsAccess } from "@/lib/team/analytics";

export const runtime = "nodejs";

export async function GET() {
  const access = await resolveAnalyticsAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [{ projects, invoices, members }, subscription, usage] = await Promise.all([
    loadAnalyticsRows(access.organizationId),
    getOrganizationSubscription(access.organizationId, access.userId),
    getOrganizationUsage(access.organizationId),
  ]);
  await logAnalyticsViewed(access.organizationId, access.userId);
  return NextResponse.json({
    ...buildOverview(projects, invoices, members),
    subscription: {
      plan: subscription.plan_name,
      status: subscription.status,
      trialEndsAt: subscription.trial_ends_at,
    },
    usageLimits: usage,
  });
}
