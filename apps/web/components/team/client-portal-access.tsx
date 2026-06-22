"use client";

import { type FormEvent, useState } from "react";

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

export function ClientPortalAccess({ projectId, defaultClientEmail, existingPortalUrl }: { projectId: string; defaultClientEmail?: string | null; existingPortalUrl?: string | null }) {
  const [clientEmail, setClientEmail] = useState(defaultClientEmail ?? "");
  const [portalUrl, setPortalUrl] = useState(existingPortalUrl ?? "");
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/client-portal/access/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, clientEmail }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; portalUrl?: string };
    setLoading(false);

    if (!response.ok || !payload.portalUrl) {
      setState({ tone: "error", message: payload.error ?? "Unable to generate client access link." });
      return;
    }

    setPortalUrl(payload.portalUrl);
    setState({ tone: "success", message: "Client access link ready." });
  }

  async function copyLink() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    setState({ tone: "success", message: "Link copied." });
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Client Portal Access</p>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <input value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} required placeholder="Client email" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none placeholder:text-mist/70" />
        <button disabled={loading} className="min-h-10 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Generating..." : "Generate Client Access Link"}
        </button>
      </form>
      {portalUrl ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-ink/45 p-3">
          <p className="break-all text-xs text-mist">{portalUrl}</p>
          <button type="button" onClick={() => void copyLink()} className="mt-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-frost transition hover:border-cyberBlue/50 hover:text-cyberBlue">
            Copy Link
          </button>
        </div>
      ) : null}
      <ActionMessage state={state} />
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-2 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
