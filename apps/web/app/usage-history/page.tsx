import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CreditTransaction = {
  id: string;
  user_id: string;
  action: string;
  credits_used: number;
  credits_added: number | null;
  source: string | null;
  status: string | null;
  created_at: string;
};

type UsageRow = {
  credits?: number | null;
  generations_count?: number | null;
  subscription_tier?: string | null;
};

type UsageHistorySearchParams = {
  q?: string;
  tool?: string;
  status?: string;
};

function actionLabel(action: string) {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function planLimit(subscriptionTier: string) {
  if (subscriptionTier === "agency") return 10000;
  if (subscriptionTier === "creator") return 2000;
  if (subscriptionTier === "pro") return 500;
  return 20;
}

function planLabel(subscriptionTier: string) {
  if (subscriptionTier === "agency") return "Agency Plan";
  if (subscriptionTier === "creator") return "Creator Plan";
  if (subscriptionTier === "pro") return "Pro Plan";
  return "Free Plan";
}

export default async function UsageHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<UsageHistorySearchParams>;
}) {
  const params = (await searchParams) ?? {};
  const query = (params.q ?? "").trim().toLowerCase();
  const toolFilter = params.tool ?? "all";
  const statusFilter = params.status ?? "all";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/usage-history");
  }

  const [{ data: usage }, { data: transactions }] = await Promise.all([
    supabase
      .from("creator_usage")
      .select("credits,generations_count,subscription_tier")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("credit_transactions")
      .select("id,user_id,action,credits_used,credits_added,source,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const usageRow = (usage ?? {}) as UsageRow;
  const history = ((transactions ?? []) as CreditTransaction[]).filter((transaction) => {
    const searchable = `${transaction.action} ${transaction.source ?? ""} ${transaction.status ?? ""}`.toLowerCase();
    const matchesQuery = query ? searchable.includes(query) : true;
    const matchesTool = toolFilter === "all" ? true : transaction.action === toolFilter;
    const matchesStatus = statusFilter === "all" ? true : (transaction.status ?? "completed") === statusFilter;
    return matchesQuery && matchesTool && matchesStatus;
  });
  const subscriptionTier = usageRow.subscription_tier ?? "free";
  const creditsRemaining = usageRow.credits ?? 20;
  const creditsUsed = ((transactions ?? []) as CreditTransaction[]).reduce((total, transaction) => total + transaction.credits_used, 0);
  const totalGenerations = usageRow.generations_count ?? history.length;
  const toolOptions = Array.from(new Set(((transactions ?? []) as CreditTransaction[]).map((transaction) => transaction.action))).sort();
  const statusOptions = Array.from(new Set(((transactions ?? []) as CreditTransaction[]).map((transaction) => transaction.status ?? "completed"))).sort();

  return (
    <main className="min-h-screen bg-ink px-4 py-5 text-frost sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(135,74,255,0.2),transparent_33%),radial-gradient(circle_at_82%_28%,rgba(18,181,255,0.14),transparent_31%)]" />
      <div className="relative mx-auto max-w-6xl">
        <nav className="nav-glass nav-glass-scrolled flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 sm:rounded-full sm:px-4">
          <Link href="/dashboard" className="text-sm font-semibold text-frost transition hover:text-cyberBlue">
            ReelMind AI
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="hidden text-xs font-medium text-mist transition hover:text-cyberBlue sm:inline-flex">
              Pricing
            </Link>
            <span className="hidden max-w-[16rem] truncate text-xs text-mist sm:block">{user.email}</span>
            <LogoutButton />
          </div>
        </nav>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyberBlue">Usage history</p>
              <h1 className="mt-3 text-3xl font-semibold text-frost">Credits and generation activity</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-mist">
                Track every credit transaction across thumbnails, storyboard work, voiceover, production packs, video renders, and exports.
              </p>
            </div>
            <span className={`w-fit rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${
              subscriptionTier === "pro" || subscriptionTier === "agency"
                ? "border-[#FBBF24]/30 bg-[#FBBF24]/10 text-[#FDE68A]"
                : "border-white/10 bg-white/[0.04] text-mist"
            }`}>
              {planLabel(subscriptionTier)}
            </span>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Credits remaining" value={creditsRemaining} detail={`of ${planLimit(subscriptionTier)}`} />
            <MetricCard label="Credits used" value={creditsUsed} detail="transaction total" />
            <MetricCard label="Total generations" value={totalGenerations} detail="tracked actions" />
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Transactions</p>
              <p className="mt-2 text-sm text-mist">{history.length} matching records</p>
            </div>
            <form className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] lg:min-w-[42rem]">
              <input
                name="q"
                defaultValue={params.q ?? ""}
                placeholder="Search action or source"
                className="rounded-full border border-white/10 bg-ink/70 px-4 py-2 text-sm text-frost outline-none transition placeholder:text-mist/60 focus:border-cyberBlue/50"
              />
              <select
                name="tool"
                defaultValue={toolFilter}
                className="rounded-full border border-white/10 bg-ink/70 px-4 py-2 text-sm text-frost outline-none transition focus:border-cyberBlue/50"
              >
                <option value="all">All tools</option>
                {toolOptions.map((tool) => (
                  <option key={tool} value={tool}>
                    {actionLabel(tool)}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={statusFilter}
                className="rounded-full border border-white/10 bg-ink/70 px-4 py-2 text-sm text-frost outline-none transition focus:border-cyberBlue/50"
              >
                <option value="all">All status</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {actionLabel(status)}
                  </option>
                ))}
              </select>
              <button type="submit" className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost">
                Filter
              </button>
            </form>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="hidden grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr] bg-white/[0.04] px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-mist md:grid">
              <span>Date</span>
              <span>Action</span>
              <span>Credits Used</span>
              <span>Tool</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-white/10">
              {history.length ? (
                history.map((transaction) => (
                  <article key={transaction.id} className="grid gap-2 bg-ink/45 p-4 text-sm md:grid-cols-[1.1fr_1fr_0.8fr_0.8fr_0.8fr] md:items-center">
                    <p className="text-mist">{new Date(transaction.created_at).toLocaleString()}</p>
                    <p className="font-medium text-frost">{actionLabel(transaction.action)}</p>
                    <p className="text-[#FDE68A]">
                      {transaction.credits_used > 0 ? `-${transaction.credits_used}` : `+${transaction.credits_added ?? 0}`} credits
                    </p>
                    <p className="capitalize text-mist">{(transaction.source ?? transaction.action).replaceAll("_", " ")}</p>
                    <span className="w-fit rounded-full border border-cyberBlue/25 bg-cyberBlue/[0.08] px-3 py-1 text-xs font-medium capitalize text-cyberBlue">
                      {(transaction.status ?? "completed").replaceAll("_", " ")}
                    </span>
                  </article>
                ))
              ) : (
                <p className="p-5 text-sm leading-6 text-mist">
                  No transactions match the current filters.
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-ink/45 p-4">
      <p className="text-2xl font-semibold text-frost">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mist">{label}</p>
      <p className="mt-2 text-xs text-cyberBlue">{detail}</p>
    </div>
  );
}
