import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { amountToPaise, paidPlans } from "@/lib/payments/razorpay-plans";
import { isPaidSubscriptionPlan } from "@/lib/billing/subscription";
import { createClient } from "@/lib/supabase/server";
import { createNotificationsForUsers } from "@/lib/team/notifications";

export const runtime = "nodejs";

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ success: false, error: "Razorpay is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON request body." }, { status: 400 });
  }

  const payload = body as {
    planId?: unknown;
    razorpay_order_id?: unknown;
    razorpay_payment_id?: unknown;
    razorpay_signature?: unknown;
  };
  const planId = payload.planId;
  const orderId = typeof payload.razorpay_order_id === "string" ? payload.razorpay_order_id : "";
  const paymentId = typeof payload.razorpay_payment_id === "string" ? payload.razorpay_payment_id : "";
  const signature = typeof payload.razorpay_signature === "string" ? payload.razorpay_signature : "";

  if (!isPaidSubscriptionPlan(planId) || !orderId || !paymentId || !signature) {
    return NextResponse.json({ success: false, error: "Missing payment verification fields." }, { status: 400 });
  }

  const plan = paidPlans[planId];
  let signatureValid = false;
  try {
    signatureValid = verifyRazorpaySignature(orderId, paymentId, signature, keySecret);
  } catch {
    signatureValid = false;
  }

  if (!signatureValid) {
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from("payment_transactions")
      .update({ status: "failed" })
      .eq("user_id", user.id)
      .eq("razorpay_order_id", orderId)
      .neq("status", "paid");
    return NextResponse.json({ success: false, error: "Payment signature verification failed." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: transaction, error: transactionError } = await adminSupabase
    .from("payment_transactions")
    .select("id,user_id,organization_id,amount,credits_added,status,plan_id")
    .eq("user_id", user.id)
    .eq("razorpay_order_id", orderId)
    .maybeSingle();

  if (transactionError || !transaction) {
    return NextResponse.json({ success: false, error: transactionError?.message ?? "Payment transaction not found." }, { status: 404 });
  }

  if (transaction.amount !== amountToPaise(plan.amount) || transaction.credits_added !== plan.credits || transaction.plan_id !== plan.id) {
    return NextResponse.json({ success: false, error: "Payment transaction does not match selected plan." }, { status: 400 });
  }

  const organizationId = transaction.organization_id as string | null;
  if (!organizationId) {
    return NextResponse.json({ success: false, error: "Payment transaction is missing organization." }, { status: 400 });
  }

  const { error } = await adminSupabase
    .from("payment_transactions")
    .update({ razorpay_payment_id: paymentId, status: "paid" })
    .eq("id", transaction.id);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);
  const { error: subscriptionError } = await adminSupabase
    .from("organization_subscriptions")
    .upsert({
      organization_id: organizationId,
      plan_name: plan.id,
      status: "active",
      trial_ends_at: null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      cancel_at_period_end: false,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      created_by: user.id,
      updated_at: now.toISOString(),
    }, { onConflict: "organization_id" });

  if (subscriptionError) {
    return NextResponse.json({ success: false, error: subscriptionError.message }, { status: 500 });
  }

  await adminSupabase.from("team_activity_logs").insert({
    organization_id: organizationId,
    user_id: user.id,
    action: "subscription_updated",
    metadata: { planId: plan.id, paymentId, orderId },
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
    title: "Subscription updated",
    message: `Workspace upgraded to ${plan.name}.`,
  });

  return NextResponse.json({
    success: true,
    plan,
    creditsAdded: plan.credits,
  });
}
