"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { leadStatuses, leadStatusLabel, type LeadStatus } from "@/lib/team/lead-types";

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

export function CreateLeadForm({ organizationId, canCreate }: { organizationId?: string; canCreate: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/leads/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId,
        name: form.get("name"),
        email: form.get("email"),
        phone: form.get("phone"),
        source: form.get("source"),
        budget: Number(form.get("budget") ?? 0),
        notes: form.get("notes"),
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to create lead." });
      return;
    }
    formRef.current?.reset();
    setState({ tone: "success", message: "Lead created." });
    router.refresh();
    router.replace("/dashboard/team/leads?updated=" + Date.now());
  }

  return (
    <form ref={formRef} onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Create Lead</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input name="name" required disabled={!canCreate || !organizationId} placeholder="Lead name" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <input name="email" type="email" disabled={!canCreate || !organizationId} placeholder="Email" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <input name="phone" disabled={!canCreate || !organizationId} placeholder="Phone" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <input name="source" disabled={!canCreate || !organizationId} placeholder="Source" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <input name="budget" type="number" min="0" step="1" disabled={!canCreate || !organizationId} placeholder="Budget" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <button disabled={loading || !canCreate || !organizationId} className="min-h-11 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Creating..." : "Create Lead"}
        </button>
        <textarea name="notes" disabled={!canCreate || !organizationId} placeholder="Notes" className="min-h-24 rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-frost outline-none disabled:opacity-50 sm:col-span-2" />
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function LeadStatusForm({ leadId, currentStatus, canManage }: { leadId: string; currentStatus: LeadStatus; canManage: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatus>(currentStatus);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/leads/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId, status }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to update lead." });
      return;
    }
    setState({ tone: "success", message: "Lead updated." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Lead Status</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select disabled={!canManage} value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)} className="min-h-11 flex-1 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50">
          {leadStatuses.map((item) => <option key={item} value={item}>{leadStatusLabel(item)}</option>)}
        </select>
        <button disabled={loading || !canManage} className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          Update
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function ConvertLeadForm({ leadId, canConvert, convertedProjectId }: { leadId: string; canConvert: boolean; convertedProjectId?: string | null }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function convert() {
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/leads/convert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; project?: { id: string } };
    setLoading(false);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to convert lead." });
      return;
    }
    setState({ tone: "success", message: "Lead converted." });
    router.refresh();
    if (payload.project?.id) router.replace(`/dashboard/team/projects/${payload.project.id}`);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Convert</p>
      <button type="button" disabled={loading || !canConvert || Boolean(convertedProjectId)} onClick={() => void convert()} className="mt-3 min-h-10 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
        {convertedProjectId ? "Already Converted" : loading ? "Converting..." : "Convert to Project"}
      </button>
      <ActionMessage state={state} />
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-2 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
