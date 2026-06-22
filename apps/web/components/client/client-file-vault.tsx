"use client";

import { useState } from "react";
import type { ProjectFileItem } from "@/components/team/project-file-vault";

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

function formatBytes(value: number | null) {
  if (!value) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function ClientFileVault({ token, files }: { token: string; files: ProjectFileItem[] }) {
  const [state, setState] = useState<ActionState>(initialState);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);

  async function download(fileId: string) {
    setBusyFileId(fileId);
    setState(initialState());
    const response = await fetch(`/api/client-portal/project/${token}/files/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; url?: string };
    setBusyFileId(null);
    if (!response.ok || !payload.url) {
      setState({ tone: "error", message: payload.error ?? "Unable to download file." });
      return;
    }
    window.open(payload.url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Delivery Vault</p>
      <div className="mt-4 space-y-3">
        {files.length ? files.map((file) => (
          <article key={file.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-frost">{file.file_name}</p>
                <p className="mt-1 text-xs text-mist">{formatBytes(file.file_size)} / {new Date(file.created_at).toLocaleString()}</p>
              </div>
              <button type="button" disabled={busyFileId === file.id} onClick={() => void download(file.id)} className="rounded-full border border-cyberBlue/40 px-3 py-1.5 text-xs font-semibold text-cyberBlue transition hover:bg-cyberBlue hover:text-ink disabled:opacity-60">
                Download
              </button>
            </div>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No files available yet.</p>
        )}
      </div>
      <ActionMessage state={state} />
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-3 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
