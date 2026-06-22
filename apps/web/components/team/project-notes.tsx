"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

export type ProjectNoteItem = {
  id: string;
  user_id: string;
  authorName: string;
  note: string;
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

export function ProjectNotes({ projectId, notes }: { projectId: string; notes: ProjectNoteItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const note = String(form.get("note") ?? "").trim();

    if (!note) {
      setState({ tone: "error", message: "Write a note before adding it." });
      return;
    }

    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/projects/notes/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, note }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to add note." });
      return;
    }

    formRef.current?.reset();
    setState({ tone: "success", message: "Note added." });
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Project Notes</p>
      <form ref={formRef} onSubmit={submit} className="mt-4">
        <textarea name="note" required placeholder="Share an update, decision, blocker, or client note." className="min-h-28 w-full rounded-2xl border border-white/10 bg-ink/60 px-3 py-3 text-sm text-frost outline-none placeholder:text-mist/70" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <ActionMessage state={state} />
          <button disabled={loading} className="min-h-10 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
            {loading ? "Adding..." : "Add Note"}
          </button>
        </div>
      </form>
      <div className="mt-5 space-y-3">
        {notes.length ? notes.map((note) => (
          <article key={note.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-frost">{note.authorName}</p>
              <p className="text-xs text-mist">{formatDate(note.created_at)}</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-mist">{note.note}</p>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No notes yet.</p>
        )}
      </div>
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
