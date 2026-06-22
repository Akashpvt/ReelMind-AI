import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { FreePlanButton } from "@/components/billing/free-plan-button";
import { RazorpayUpgradeButton } from "@/components/billing/razorpay-upgrade-button";
import { getOrganizationSubscription, getOrganizationUsage } from "@/lib/billing/subscription";
import { allPlans, formatRupees, paidPlans, planLimits, type PaidPlanId } from "@/lib/payments/razorpay-plans";
import { createClient } from "@/lib/supabase/server";
import { loadTeamData } from "@/lib/team/load-team-data";
import { canManageBilling } from "@/lib/team/permissions";

export const dynamic = "force-dynamic";

type BillingSearchParams = {
  plan?: string;
};

type PaymentTransaction = {
  id: string;
  razorpay_payment_id: string | null;
  razorpay_order_id: string;
  amount: number;
  status: string;
  credits_added: number;
  plan_id: string | null;
  billing_kind: string | null;
  created_at: string;
};

function inferPlanName(payment: PaymentTransaction) {
  if (payment.plan_id) return payment.plan_id.charAt(0).toUpperCase() + payment.plan_id.slice(1);
  const plan = Object.values(paidPlans).find((item) => item.credits === payment.credits_added && item.amount * 100 === payment.amount);
  return plan?.name ?? "Credit purchase";
}

function percent(value: number, limit: number) {
  if (!limit) return 0;
  return Math.min(100, Math.round((value / limit) * 100));
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams?: Promise<BillingSearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const selectedPlan = params.plan && params.plan in paidPlans ? (params.plan as PaidPlanId) : "pro";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/billing");
  }

  const { activeTeam } = await loadTeamData();
  const organization = activeTeam?.organization;
  if (!organization?.id) {
    redirect("/dashboard/team");
  }
  if (!canManageBilling(activeTeam?.role)) {
    redirect("/dashboard/team?error=billing_forbidden");
  }

  const [subscription, organizationUsage, { data: payments }] = await Promise.all([
    getOrganizationSubscription(organization.id, user.id),
    getOrganizationUsage(organization.id),
    supabase
      .from("payment_transactions")
      .select("id,razorpay_payment_id,razorpay_order_id,amount,status,credits_added,plan_id,billing_kind,created_at")
      .eq("organization_id", organization.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const history = ((payments ?? []) as PaymentTransaction[]);
  const limits = planLimits(subscription.plan_name);

  return (
    <main className="min-h-screen bg-ink px-4 py-5 text-frost sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(18,181,255,0.18),transparent_32%),radial-gradient(circle_at_84%_18%,rgba(251,191,36,0.12),transparent_28%)]" />
      <div className="relative mx-auto max-w-6xl">
        <nav className="nav-glass nav-glass-scrolled flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:rounded-full sm:px-4">
          <Link href="/dashboard" className="text-sm font-semibold text-frost transition hover:text-cyberBlue">
            ReelMind AI
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/usage-history" className="hidden text-xs font-medium text-mist transition hover:text-cyberBlue sm:inline-flex">
              Usage
            </Link>
            <span className="hidden max-w-[16rem] truncate text-xs text-mist sm:block">{user.email}</span>
            <LogoutButton />
          </div>
        </nav>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyberBlue">Billing</p>
          <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-frost sm:text-4xl">SaaS Billing & Subscription</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">
                Manage workspace plans, Razorpay payments, trial status, usage limits, and team seats for {organization.name}.
              </p>
            </div>
            <div className="rounded-2xl border border-cyberBlue/20 bg-cyberBlue/[0.06] p-4">
              <p className="text-3xl font-semibold text-frost">{subscription.plan_name.toUpperCase()}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist">{subscription.status}</p>
              <p className="mt-2 text-xs text-cyberBlue">{subscription.trial_ends_at ? `Trial ends ${new Date(subscription.trial_ends_at).toLocaleDateString()}` : "Monthly billing"}</p>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-4">
          <UsageCard label="Leads" value={organizationUsage.leads} limit={limits.leads} />
          <UsageCard label="Projects" value={organizationUsage.projects} limit={limits.projects} />
          <UsageCard label="Team Members" value={organizationUsage.teamMembers} limit={limits.teamMembers} />
          <UsageCard label="Storage MB" value={organizationUsage.fileStorageMb} limit={limits.fileStorageMb} />
        </section>

        <section className="mt-5 grid gap-4 lg:grid-cols-4">
          {allPlans().map((plan) => (
            <article
              key={plan.id}
              className={`rounded-2xl border p-5 ${
                subscription.plan_name === plan.id || selectedPlan === plan.id
                  ? "border-cyberBlue/45 bg-cyberBlue/[0.08]"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-frost">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-mist">{plan.description}</p>
                </div>
                <span className="rounded-full border border-[#FBBF24]/30 bg-[#FBBF24]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FDE68A]">
                  {plan.credits.toLocaleString()} cr
                </span>
              </div>
              <p className="mt-6 text-4xl font-semibold text-frost">{formatRupees(plan.amount)}</p>
              <div className="mt-4 space-y-1 text-xs text-mist">
                <p>{plan.limits.leads} leads / {plan.limits.projects} projects</p>
                <p>{plan.limits.teamMembers} seats / {plan.limits.fileStorageMb} MB storage</p>
              </div>
              {plan.id === "free" ? (
                <FreePlanButton organizationId={organization.id} disabled={subscription.plan_name === "free"} />
              ) : (
                <RazorpayUpgradeButton
                  planId={plan.id}
                  organizationId={organization.id}
                  label={subscription.plan_name === plan.id ? "Current Plan" : `Switch to ${plan.name}`}
                  userEmail={user.email}
                  className="mt-6 w-full rounded-full bg-cyberBlue px-4 py-3 text-sm font-semibold text-ink transition hover:bg-frost disabled:cursor-not-allowed disabled:opacity-60"
                />
              )}
            </article>
          ))}
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Purchase history</p>
              <p className="mt-2 text-sm text-mist">Razorpay orders, upgrades, downgrades, and subscription payments for this workspace.</p>
            </div>
            <Link href="/pricing" className="text-xs font-medium text-cyberBlue transition hover:text-frost">
              Compare plans
            </Link>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="hidden grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr] bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-mist md:grid">
              <span>Date</span>
              <span>Plan</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Payment ID</span>
            </div>
            <div className="divide-y divide-white/10">
              {history.length ? (
                history.map((payment) => (
                  <article key={payment.id} className="grid gap-2 bg-ink/45 p-4 text-sm md:grid-cols-[1fr_0.8fr_0.8fr_0.8fr_1fr] md:items-center">
                    <p className="text-mist">{new Date(payment.created_at).toLocaleString()}</p>
                    <p className="font-medium text-frost">{inferPlanName(payment)}</p>
                    <p className="text-mist">{formatRupees(payment.amount / 100)}</p>
                    <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium capitalize ${
                      payment.status === "paid"
                        ? "border-[#86EFAC]/25 bg-[#86EFAC]/10 text-[#86EFAC]"
                        : payment.status === "failed"
                          ? "border-[#FDA4AF]/25 bg-[#FDA4AF]/10 text-[#FDA4AF]"
                          : "border-cyberBlue/25 bg-cyberBlue/[0.08] text-cyberBlue"
                    }`}>
                      {payment.status}
                    </span>
                    <p className="truncate text-xs text-mist">{payment.razorpay_payment_id ?? payment.razorpay_order_id}</p>
                  </article>
                ))
              ) : (
                <p className="p-5 text-sm leading-6 text-mist">
                  Purchase history appears after your first Razorpay order.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function UsageCard({ label, value, limit }: { label: string; value: number; limit: number }) {
  const usagePercent = percent(value, limit);
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-2xl font-semibold text-frost">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mist">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-cyberBlue" style={{ width: `${usagePercent}%` }} />
      </div>
      <p className="mt-2 text-xs text-cyberBlue">Limit {limit}</p>
    </article>
  );
}
