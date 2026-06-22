"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { teamRoles } from "@/lib/team/permissions";

type ActionState = {
  message: string;
  tone: "success" | "error" | "idle";
};

function initialState(): ActionState {
  return { message: "", tone: "idle" };
}

export function CreateOrganizationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/team/create-organization", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to create organization." });
      return;
    }
    setName("");
    setState({ tone: "success", message: "Organization created." });
    router.replace(`/dashboard/team?updated=${Date.now()}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Create Organization</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Agency or client studio name" className="min-h-11 flex-1 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none focus:border-cyberBlue/40" />
        <button disabled={loading} className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Creating..." : "Create"}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function InviteMemberForm({ organizationId, canInvite }: { organizationId?: string; canInvite: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("creator");
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/team/invite-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, email, role }),
    });
    const payload = (await response.json()) as { error?: string; invitation?: { invite_token?: string } };
    setLoading(false);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to invite member." });
      return;
    }
    setEmail("");
    setState({ tone: "success", message: `Invite created. Token: ${payload.invitation?.invite_token ?? "created"}` });
    router.replace(`/dashboard/team/members?updated=${Date.now()}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Invite by Email</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_9rem_auto]">
        <input disabled={!canInvite || !organizationId} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="member@email.com" className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <select disabled={!canInvite || !organizationId} value={role} onChange={(event) => setRole(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50">
          {teamRoles.filter((item) => item !== "owner").map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button disabled={loading || !canInvite || !organizationId} className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Inviting..." : "Invite"}
        </button>
      </div>
      {!canInvite ? <p className="mt-2 text-xs text-mist">Only owners and admins can invite members.</p> : null}
      <ActionMessage state={state} />
    </form>
  );
}

export function AcceptInviteForm() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/team/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteToken }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to accept invite." });
      return;
    }
    setInviteToken("");
    setState({ tone: "success", message: "Invitation accepted." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Accept Invite</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} placeholder="Invitation token" className="min-h-11 flex-1 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none" />
        <button disabled={loading} className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          {loading ? "Accepting..." : "Accept"}
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function EmailNotificationsForm({ organizationId, canManage, initialEnabled }: { organizationId?: string; canManage: boolean; initialEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(nextEnabled: boolean) {
    if (!organizationId) return;
    setEnabled(nextEnabled);
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/team/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, emailNotificationsEnabled: nextEnabled }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setEnabled(!nextEnabled);
      setState({ tone: "error", message: payload.error ?? "Unable to update email settings." });
      return;
    }
    setState({ tone: "success", message: nextEnabled ? "Email notifications enabled." : "Email notifications disabled." });
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Email Notifications</p>
          <p className="mt-2 text-xs text-mist">Automated project emails are {enabled ? "on" : "off"}.</p>
        </div>
        <button type="button" disabled={!organizationId || !canManage || loading} onClick={() => void submit(!enabled)} className={`rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${enabled ? "bg-cyberBlue text-ink hover:bg-frost" : "border border-white/10 text-frost hover:border-cyberBlue/40"}`}>
          {enabled ? "ON" : "OFF"}
        </button>
      </div>
      {!canManage ? <p className="mt-2 text-xs text-mist">Only owners and admins can update email settings.</p> : null}
      <ActionMessage state={state} />
    </section>
  );
}

export function CreateClientProjectForm({ organizationId, canCreate }: { organizationId?: string; canCreate: boolean }) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [state, setState] = useState<ActionState>(initialState);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!organizationId) return;
    setLoading(true);
    setState(initialState());
    const response = await fetch("/api/team/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, projectName }),
    });
    const payload = (await response.json()) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setState({ tone: "error", message: payload.error ?? "Unable to create client project." });
      return;
    }
    setProjectName("");
    setState({ tone: "success", message: "Client project created." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyberBlue">Create Client Project</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input disabled={!canCreate || !organizationId} value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Client campaign or project" className="min-h-11 flex-1 rounded-xl border border-white/10 bg-ink/60 px-3 text-sm text-frost outline-none disabled:opacity-50" />
        <button disabled={loading || !canCreate || !organizationId} className="rounded-full bg-cyberBlue px-4 py-2 text-sm font-semibold text-ink transition hover:bg-frost disabled:opacity-60">
          Create
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

export function MemberControls({ organizationId, memberId, currentRole, canManage }: { organizationId?: string; memberId: string; currentRole: string; canManage: boolean }) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);

  async function changeRole() {
    if (!organizationId) return;
    await fetch("/api/team/change-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, memberId, role }),
    });
    router.refresh();
  }

  async function removeMember() {
    if (!organizationId) return;
    await fetch("/api/team/remove-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, memberId }),
    });
    router.refresh();
  }

  if (!canManage || currentRole === "owner") return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-full border border-white/10 bg-ink/70 px-3 py-1.5 text-xs text-frost">
        {teamRoles.filter((item) => item !== "owner").map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <button type="button" onClick={() => void changeRole()} className="rounded-full border border-cyberBlue/30 px-3 py-1.5 text-xs text-cyberBlue">Change role</button>
      <button type="button" onClick={() => void removeMember()} className="rounded-full border border-[#FB7185]/30 px-3 py-1.5 text-xs text-[#FDA4AF]">Remove</button>
    </div>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return <p className={`mt-2 text-xs ${state.tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{state.message}</p>;
}

export const CreateTeamForm = CreateOrganizationForm;
