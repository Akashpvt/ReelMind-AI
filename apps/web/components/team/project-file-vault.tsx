"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

export type ProjectFileItem = {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
};

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

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

export function ProjectFileVault({ projectId, files }: { projectId: string; files: ProjectFileItem[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);
  const [busyFileId, setBusyFileId] = useState<string | null>(null);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.name) {
      setState({ tone: "error", message: "Choose a file to upload." });
      return;
    }

    form.set("projectId", projectId);
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/projects/files/upload", {
      method: "POST",
      body: form,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to upload file." });
      return;
    }

    formRef.current?.reset();
    setState({ tone: "success", message: "File uploaded." });
    router.refresh();
  }

  async function download(fileId: string) {
    setBusyFileId(fileId);
    setState(initialState());
    const response = await fetch("/api/projects/files/download", {
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

  async function deleteFile(fileId: string) {
    setBusyFileId(fileId);
    setState(initialState());
    const response = await fetch("/api/projects/files/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setBusyFileId(null);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to delete file." });
      return;
    }
    setState({ tone: "success", message: "File deleted." });
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Delivery Vault</p>
      <form ref={formRef} onSubmit={upload} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input name="file" type="file" accept=".mp4,.zip,.pdf,.png,.jpg,.jpeg" required className="min-h-11 flex-1 rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-frost outline-none file:mr-3 file:rounded-full file:border-0 file:bg-cyberBlue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink" />
        <button disabled={loading} className="min-h-11 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Uploading..." : "Upload File"}
        </button>
      </form>
      <ActionMessage state={state} />
      <div className="mt-5 space-y-3">
        {files.length ? files.map((file) => (
          <article key={file.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-frost">{file.file_name}</p>
                <p className="mt-1 text-xs text-mist">{formatBytes(file.file_size)} / {formatDate(file.created_at)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busyFileId === file.id} onClick={() => void download(file.id)} className="rounded-full border border-cyberBlue/40 px-3 py-1.5 text-xs font-semibold text-cyberBlue transition hover:bg-cyberBlue hover:text-ink disabled:opacity-60">
                  Download
                </button>
                <button type="button" disabled={busyFileId === file.id} onClick={() => void deleteFile(file.id)} className="rounded-full border border-[#FDA4AF]/40 px-3 py-1.5 text-xs font-semibold text-[#FDA4AF] transition hover:bg-[#FDA4AF] hover:text-ink disabled:opacity-60">
                  Delete
                </button>
              </div>
            </div>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No files uploaded yet.</p>
        )}
      </div>
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-3 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
