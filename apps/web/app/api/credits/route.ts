import { NextResponse } from "next/server";
import { planLimit, planLabel } from "@/lib/credits/credit-rules";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type UsageAnalyticsRow = {
  tool_name: string;
  credits_consumed: number;
  created_at: string;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [{ data: usage }, { data: subscription }, { data: transactions }, { data: analytics }] = await Promise.all([
    supabase
      .from("creator_usage")
      .select("credits,generations_count,subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select("plan_name,status,credits_total,credits_remaining,start_date,end_date")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("credit_transactions")
      .select("credits_used,credits_added,action,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("usage_analytics")
      .select("tool_name,credits_consumed,created_at")
      .eq("user_id", user.id),
  ]);

  const planName = subscription?.plan_name ?? usage?.subscription_tier ?? "free";
  const analyticsRows = ((analytics ?? []) as UsageAnalyticsRow[]);
  const toolCounts = analyticsRows.reduce<Record<string, number>>((counts, row) => {
    counts[row.tool_name] = (counts[row.tool_name] ?? 0) + 1;
    return counts;
  }, {});
  const mostUsedTool = Object.entries(toolCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const generationsThisMonth = analyticsRows.filter((row) => new Date(row.created_at) >= monthStart).length;
  const creditsConsumed = analyticsRows.reduce((sum, row) => sum + row.credits_consumed, 0);

  return NextResponse.json({
    credits: {
      remaining: usage?.credits ?? subscription?.credits_remaining ?? 20,
      total: subscription?.credits_total ?? planLimit(planName),
      consumed: creditsConsumed,
    },
    plan: {
      name: planName,
      label: planLabel(planName),
      status: subscription?.status ?? "active",
    },
    usageStats: {
      totalGenerations: usage?.generations_count ?? analyticsRows.length,
      generationsThisMonth,
      mostUsedTool,
    },
    recentTransactions: transactions ?? [],
  });
}
