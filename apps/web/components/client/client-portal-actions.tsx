"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

export function ClientPortalActions({ token, canAct }: { token: string; canAct: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialState);
  const [loadingAction, setLoadingAction] = useState<"approve" | "revision" | null>(null);

  async function submit(action: "approve" | "revision") {
    const endpoint = action === "approve"
      ? `/api/client-portal/project/${token}/approve`
      : `/api/client-portal/project/${token}/request-revision`;
    setLoadingAction(action);
    setState(initialState());
    const response = await fetch(endpoint, { method: "POST" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoadingAction(null);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to update project." });
      return;
    }

    setState({ tone: "success", message: "Project updated." });
    router.refresh();
  }

  if (!canAct) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Client Actions</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" disabled={Boolean(loadingAction)} onClick={() => void submit("approve")} className="min-h-11 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loadingAction === "approve" ? "Approving..." : "Approve Project"}
        </button>
        <button type="button" disabled={Boolean(loadingAction)} onClick={() => void submit("revision")} className="min-h-11 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-frost transition hover:border-[#FDA4AF]/50 hover:text-[#FDA4AF] disabled:opacity-60">
          {loadingAction === "revision" ? "Requesting..." : "Request Revision"}
        </button>
      </div>
      <ActionMessage state={state} />
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-3 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
