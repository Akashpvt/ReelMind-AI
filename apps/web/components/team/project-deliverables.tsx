"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

export type ProjectDeliverableItem = {
  id: string;
  uploaded_by: string;
  uploaderName: string;
  file_name: string;
  file_url: string;
  created_at: string;
};

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function ProjectDeliverables({ projectId, deliverables }: { projectId: string; deliverables: ProjectDeliverableItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fileName = String(form.get("fileName") ?? "").trim();
    const fileUrl = String(form.get("fileUrl") ?? "").trim();

    if (!fileName || !fileUrl) {
      setState({ tone: "error", message: "File name and URL are required." });
      return;
    }

    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/projects/deliverables/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, fileName, fileUrl }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to upload deliverable." });
      return;
    }

    formRef.current?.reset();
    setState({ tone: "success", message: "Deliverable uploaded." });
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Deliverables</p>
      <form ref={formRef} onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.2fr_auto]">
        <input name="fileName" required placeholder="File Name" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none placeholder:text-mist/70" />
        <input name="fileUrl" required placeholder="File URL" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none placeholder:text-mist/70" />
        <button disabled={loading} className="min-h-11 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Uploading..." : "Upload Deliverable"}
        </button>
      </form>
      <ActionMessage state={state} />
      <div className="mt-5 space-y-3">
        {deliverables.length ? deliverables.map((deliverable) => (
          <article key={deliverable.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
            <a href={deliverable.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-frost transition hover:text-cyberBlue">
              {deliverable.file_name}
            </a>
            <p className="mt-2 text-xs text-mist">
              {deliverable.uploaderName} / {formatDate(deliverable.created_at)}
            </p>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No deliverables yet.</p>
        )}
      </div>
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-3 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
