"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import type { ProjectMessageItem } from "@/components/team/project-messages";

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

export function ClientProjectMessages({ token, messages }: { token: string; messages: ProjectMessageItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const message = String(form.get("message") ?? "").trim();

    if (!message) {
      setState({ tone: "error", message: "Write a message before sending." });
      return;
    }

    setLoading(true);
    setState(initialState());
    const response = await fetch(`/api/client-portal/project/${token}/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to send message." });
      return;
    }

    formRef.current?.reset();
    setState({ tone: "success", message: "Message sent." });
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Messages</p>
      <div className="mt-4 space-y-3">
        {messages.length ? messages.map((item) => (
          <article key={item.id} className={`rounded-2xl border p-4 ${item.sender_type === "client" ? "border-cyberBlue/20 bg-cyberBlue/[0.06]" : "border-white/10 bg-ink/45"}`}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-frost">{item.sender_name}</p>
              <p className="text-xs text-mist">{formatDate(item.created_at)}</p>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-mist">{item.message}</p>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No messages yet.</p>
        )}
      </div>
      <form ref={formRef} onSubmit={submit} className="mt-4">
        <textarea name="message" required placeholder="Send a message to the agency." className="min-h-24 w-full rounded-2xl border border-white/10 bg-ink/60 px-3 py-3 text-sm text-frost outline-none placeholder:text-mist/70" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <ActionMessage state={state} />
          <button disabled={loading} className="min-h-10 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
            {loading ? "Sending..." : "Send Message"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
