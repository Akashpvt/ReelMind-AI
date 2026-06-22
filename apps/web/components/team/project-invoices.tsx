"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

export type ProjectInvoiceItem = {
  id: string;
  organization_id: string;
  project_id: string;
  invoice_number: string | null;
  amount: number | string;
  currency: string;
  status: "pending" | "partially_paid" | "paid" | "cancelled" | string;
  issued_at: string;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

export function formatInvoiceCurrency(amount: number | string, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusClass(status: string) {
  if (status === "paid") return "border-[#86EFAC]/40 bg-[#86EFAC]/10 text-[#86EFAC]";
  if (status === "cancelled") return "border-[#FDA4AF]/40 bg-[#FDA4AF]/10 text-[#FDA4AF]";
  if (status === "partially_paid") return "border-[#FDBA74]/40 bg-[#FDBA74]/10 text-[#FDBA74]";
  return "border-cyberBlue/40 bg-cyberBlue/[0.08] text-cyberBlue";
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function ProjectInvoices({ projectId, invoices }: { projectId: string; invoices: ProjectInvoiceItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);
  const [busyInvoiceId, setBusyInvoiceId] = useState<string | null>(null);

  async function createInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount"));
    const notes = String(form.get("notes") ?? "").trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      setState({ tone: "error", message: "Enter an invoice amount greater than 0." });
      return;
    }

    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/projects/invoices/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, amount, notes }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to create invoice." });
      return;
    }

    formRef.current?.reset();
    setState({ tone: "success", message: "Invoice created." });
    router.refresh();
  }

  async function updateInvoice(invoiceId: string, action: "mark-paid" | "cancel") {
    setBusyInvoiceId(invoiceId);
    setState(initialState());
    const response = await fetch(`/api/projects/invoices/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setBusyInvoiceId(null);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to update invoice." });
      return;
    }

    setState({ tone: "success", message: action === "mark-paid" ? "Invoice marked paid." : "Invoice cancelled." });
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Invoices</p>
      <form ref={formRef} onSubmit={createInvoice} className="mt-4 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
        <input name="amount" type="number" min="1" step="0.01" placeholder="Amount" required className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-frost outline-none placeholder:text-mist" />
        <input name="notes" type="text" placeholder="Notes" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-frost outline-none placeholder:text-mist" />
        <button disabled={loading} className="min-h-11 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Creating..." : "Create Invoice"}
        </button>
      </form>
      <ActionMessage state={state} />
      <div className="mt-5 space-y-3">
        {invoices.length ? invoices.map((invoice) => {
          const isFinal = invoice.status === "paid" || invoice.status === "cancelled";
          return (
            <article key={invoice.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-frost">{invoice.invoice_number ?? "Invoice"}</p>
                    <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${statusClass(invoice.status)}`}>{label(invoice.status)}</span>
                  </div>
                  <p className="mt-1 text-xs text-mist">{formatInvoiceCurrency(invoice.amount, invoice.currency)} / Issued {formatDate(invoice.issued_at)}</p>
                  {invoice.notes ? <p className="mt-2 text-xs text-mist">{invoice.notes}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={isFinal || busyInvoiceId === invoice.id} onClick={() => void updateInvoice(invoice.id, "mark-paid")} className="rounded-full border border-[#86EFAC]/40 px-3 py-1.5 text-xs font-semibold text-[#86EFAC] transition hover:bg-[#86EFAC] hover:text-ink disabled:opacity-50">
                    Mark Paid
                  </button>
                  <button type="button" disabled={isFinal || busyInvoiceId === invoice.id} onClick={() => void updateInvoice(invoice.id, "cancel")} className="rounded-full border border-[#FDA4AF]/40 px-3 py-1.5 text-xs font-semibold text-[#FDA4AF] transition hover:bg-[#FDA4AF] hover:text-ink disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </article>
          );
        }) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No invoices created yet.</p>
        )}
      </div>
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-3 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
