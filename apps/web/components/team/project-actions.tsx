"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";
import { nextWorkflowStatus, projectPriorities, projectStatuses, statusLabel, type ProjectStatus } from "@/lib/team/project-types";

type ActionState = {
  message: string;
  tone: "idle" | "success" | "error";
};

type MemberOption = {
  id: string;
  user_id: string;
  displayName: string;
  displayEmail: string;
  role?: string;
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

function assignmentOptionValue(member: MemberOption) {
  return member.id.length === 36 ? member.id : member.user_id;
}

export function CreateProjectForm({ organizationId, canCreate }: { organizationId?: string; canCreate: boolean }) {
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
    const response = await fetch("/api/projects/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId,
        clientName: form.get("clientName"),
        clientEmail: form.get("clientEmail"),
        clientPhone: form.get("clientPhone"),
        projectTitle: form.get("projectTitle"),
        projectDescription: form.get("projectDescription"),
        budget: Number(form.get("budget") ?? 0),
        deadline: form.get("deadline"),
        priority: form.get("priority"),
      }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to create project." });
      return;
    }

    formRef.current?.reset();
    setState({ tone: "success", message: "Project created." });
    router.refresh();
    router.replace("/dashboard/team/projects?updated=" + Date.now());
  }

  return (
    <form ref={formRef} onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Create Project</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input name="clientName" disabled={!canCreate || !organizationId} required placeholder="Client name" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <input name="clientEmail" disabled={!canCreate || !organizationId} placeholder="Client email" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <input name="clientPhone" disabled={!canCreate || !organizationId} placeholder="WhatsApp number with country code" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50 sm:col-span-2" />
        <input name="projectTitle" disabled={!canCreate || !organizationId} required placeholder="Project title" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50 sm:col-span-2" />
        <textarea name="projectDescription" disabled={!canCreate || !organizationId} placeholder="Brief, goals, deliverables" className="min-h-24 rounded-xl border border-white/10 bg-ink/60 px-3 py-2 text-sm text-frost outline-none disabled:opacity-50 sm:col-span-2" />
        <input name="budget" disabled={!canCreate || !organizationId} type="number" min="0" step="1" placeholder="Budget" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <input name="deadline" disabled={!canCreate || !organizationId} type="datetime-local" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <select name="priority" disabled={!canCreate || !organizationId} defaultValue="medium" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50">
          {projectPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </select>
        <button disabled={loading || !canCreate || !organizationId} className="min-h-11 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Creating..." : "Create Project"}
        </button>
      </div>
      {!canCreate ? <p className="mt-2 text-xs text-mist">Owners, admins, managers, and editors can create projects.</p> : null}
      <ActionMessage state={state} />
    </form>
  );
}

export function ProjectStatusForm({ projectId, currentStatus }: { projectId: string; currentStatus: ProjectStatus }) {
  const router = useRouter();
  const [status, setStatus] = useState<ProjectStatus>(currentStatus);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    await fetch("/api/projects/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, status }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Status</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <select value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus)} className="min-h-11 flex-1 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none">
          {projectStatuses.filter((item) => item !== "archived").map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button disabled={loading} className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          Update
        </button>
      </div>
    </form>
  );
}

export function AssignProjectForm({ projectId, assignedMemberId, members, compact = false }: { projectId: string; assignedMemberId?: string | null; members: MemberOption[]; compact?: boolean }) {
  const router = useRouter();
  const initialMemberId = members.find((member) => member.user_id === assignedMemberId || member.id === assignedMemberId);
  const [memberId, setMemberId] = useState(initialMemberId ? assignmentOptionValue(initialMemberId) : "");
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberId) {
      setState({ tone: "error", message: "Choose a member before assigning." });
      return;
    }

    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/projects/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, memberId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to assign project." });
      return;
    }

    setState({ tone: "success", message: "Project assigned." });
    router.refresh();
    router.replace("/dashboard/team/projects?updated=" + Date.now());
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "rounded-2xl border border-white/10 bg-white/[0.035] p-4"}>
      {compact ? null : <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Assign</p>}
      <div className={`${compact ? "" : "mt-3"} flex flex-col gap-2 sm:flex-row`}>
        <select value={memberId} onChange={(event) => setMemberId(event.target.value)} className="min-h-11 flex-1 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none">
          <option value="">Unassigned</option>
          {members.map((member) => <option key={member.id} value={assignmentOptionValue(member)}>{member.displayName}</option>)}
        </select>
        <button disabled={loading || !memberId} className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Assigning..." : "Assign"}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

function workflowButtonLabel(status: ProjectStatus) {
  const nextStatus = nextWorkflowStatus(status);
  if (!nextStatus) return null;
  return nextStatus === "delivered" ? "Mark Delivered" : `Move to ${statusLabel(nextStatus)}`;
}

export function StatusMoveForm({ projectId, currentStatus }: { projectId: string; currentStatus: ProjectStatus }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);
  const nextStatus = nextWorkflowStatus(currentStatus);
  const buttonLabel = workflowButtonLabel(currentStatus);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nextStatus) return;

    setLoading(true);
    setState(initialState());
    const endpoint = nextStatus === "approved"
      ? "/api/projects/approve"
      : nextStatus === "delivered"
        ? "/api/projects/deliver"
        : "/api/projects/update-status";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextStatus === "approved" || nextStatus === "delivered" ? { projectId } : { projectId, status: nextStatus }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to move project." });
      return;
    }

    setState({ tone: "success", message: "Status updated." });
    router.refresh();
  }

  return (
    <div className="mt-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">Current Status</p>
      <p className="mt-1 text-xs font-semibold text-frost">{currentStatus.toUpperCase()}</p>
      {nextStatus && buttonLabel ? (
        <form onSubmit={submit} className="mt-2">
          <button disabled={loading} className="min-h-9 w-full rounded-full bg-cyberBlue px-3 py-2 text-xs font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
            {loading ? "Moving..." : buttonLabel}
          </button>
        </form>
      ) : null}
      <ActionMessage state={state} />
    </div>
  );
}

export function ProjectApprovalActions({ projectId, currentStatus }: { projectId: string; currentStatus: ProjectStatus }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialState);
  const [loadingAction, setLoadingAction] = useState<"approve" | "revision" | "deliver" | null>(null);

  async function submit(action: "approve" | "revision" | "deliver") {
    const endpoint = action === "approve"
      ? "/api/projects/approve"
      : action === "revision"
        ? "/api/projects/request-revision"
        : "/api/projects/deliver";
    setLoadingAction(action);
    setState(initialState());
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoadingAction(null);

    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to update approval status." });
      return;
    }

    setState({ tone: "success", message: "Approval status updated." });
    router.refresh();
  }

  if (currentStatus !== "review" && currentStatus !== "approved") {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Client Approval</p>
      {currentStatus === "review" ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button type="button" disabled={Boolean(loadingAction)} onClick={() => void submit("approve")} className="min-h-10 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
            {loadingAction === "approve" ? "Approving..." : "Approve Project"}
          </button>
          <button type="button" disabled={Boolean(loadingAction)} onClick={() => void submit("revision")} className="min-h-10 rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-frost transition hover:border-[#FDA4AF]/50 hover:text-[#FDA4AF] disabled:opacity-60">
            {loadingAction === "revision" ? "Requesting..." : "Request Revision"}
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <button type="button" disabled={Boolean(loadingAction)} onClick={() => void submit("deliver")} className="min-h-10 rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
            {loadingAction === "deliver" ? "Delivering..." : "Mark Delivered"}
          </button>
        </div>
      )}
      <ActionMessage state={state} />
    </section>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-2 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}
