import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { amountToPaise, paidPlans } from "@/lib/payments/razorpay-plans";
import { isPaidSubscriptionPlan } from "@/lib/billing/subscription";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

type RazorpayOrderResponse = {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  error?: {
    description?: string;
    reason?: string;
  };
};

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return { keyId, keySecret };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const razorpayConfig = getRazorpayConfig();
  if (!razorpayConfig) {
    return NextResponse.json({ success: false, error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
  }

  const planId = typeof body === "object" && body !== null && "planId" in body ? (body as { planId?: unknown }).planId : null;
  const organizationId = typeof body === "object" && body !== null && "organizationId" in body ? (body as { organizationId?: unknown }).organizationId : null;
  if (!isPaidSubscriptionPlan(planId)) {
    return NextResponse.json({ success: false, error: "Invalid paid plan." }, { status: 400 });
  }
  if (typeof organizationId !== "string" || !organizationId) {
    return NextResponse.json({ success: false, error: "organizationId is required." }, { status: 400 });
  }

  const activeTeam = await resolveActiveTeam(user.id, organizationId);
  if (!activeTeam || (activeTeam.membership.role !== "owner" && activeTeam.membership.role !== "admin")) {
    return NextResponse.json({ success: false, error: "Only owners and admins can manage billing." }, { status: 403 });
  }

  const plan = paidPlans[planId];
  const amount = amountToPaise(plan.amount);
  const auth = Buffer.from(`${razorpayConfig.keyId}:${razorpayConfig.keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `reelmind_${user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: user.id,
        organization_id: organizationId,
        plan_id: plan.id,
        credits: String(plan.credits),
        billing_kind: "subscription",
      },
    }),
  });

  const responseBody = (await response.json().catch(() => ({}))) as RazorpayOrderResponse;
  if (!response.ok || !responseBody.id) {
    const message = responseBody.error?.description ?? responseBody.error?.reason ?? "Unable to create Razorpay order.";
    return NextResponse.json({ success: false, error: message }, { status: response.status || 502 });
  }

  const adminSupabase = createAdminClient();
  const { error } = await adminSupabase.from("payment_transactions").upsert({
    user_id: user.id,
    organization_id: organizationId,
    razorpay_order_id: responseBody.id,
    amount,
    status: "created",
    credits_added: plan.credits,
    plan_id: plan.id,
    billing_kind: "subscription",
  }, { onConflict: "razorpay_order_id" });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    keyId: razorpayConfig.keyId,
    order: {
      id: responseBody.id,
      amount: responseBody.amount ?? amount,
      currency: responseBody.currency ?? "INR",
      status: responseBody.status ?? "created",
    },
    plan,
  });
}
