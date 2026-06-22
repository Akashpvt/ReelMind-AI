"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, type FormEvent } from "react";
import type { WorkspaceBranding } from "@/lib/team/branding";

const tabs = ["General", "Branding", "Domain", "Security"] as const;
type Tab = typeof tabs[number];

export function WorkspaceSettings({ organizationId, initial }: { organizationId: string; initial: WorkspaceBranding }) {
  const [tab, setTab] = useState<Tab>("General");
  const [settings, setSettings] = useState(initial);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const field = "workspace-input mt-2 w-full rounded-xl border border-white/10 bg-ink/55 px-4 py-3 text-sm text-frost outline-none focus:border-cyberBlue/50";

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage("");
    const response = await fetch("/api/team/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, ...settings }) });
    const payload = await response.json() as { error?: string; settings?: Record<string, unknown> };
    setSaving(false); setMessage(response.ok ? "Workspace settings saved." : payload.error ?? "Unable to save settings.");
  }

  async function uploadLogo(file?: File) {
    if (!file) return; setSaving(true); setMessage(""); const body = new FormData(); body.set("organizationId", organizationId); body.set("logo", file);
    const response = await fetch("/api/team/settings/logo", { method: "POST", body }); const payload = await response.json() as { error?: string; logoUrl?: string }; setSaving(false);
    if (response.ok && payload.logoUrl) setSettings((current) => ({ ...current, logoUrl: payload.logoUrl ?? null }));
    setMessage(response.ok ? "Logo uploaded." : payload.error ?? "Unable to upload logo.");
  }

  return <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035]">
    <div className="flex overflow-x-auto border-b border-white/10 p-2">{tabs.map(item => <button key={item} onClick={() => setTab(item)} className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${tab === item ? "bg-cyberBlue/10 text-cyberBlue" : "text-mist hover:text-frost"}`}>{item}</button>)}</div>
    <form onSubmit={save} className="p-5 sm:p-7">
      {tab === "General" ? <div className="grid gap-5 md:grid-cols-2"><Setting label="Agency name"><input required value={settings.agencyName} onChange={e => setSettings({...settings, agencyName:e.target.value})} className={field} /></Setting><Setting label="Support email"><input type="email" value={settings.supportEmail ?? ""} onChange={e => setSettings({...settings, supportEmail:e.target.value})} className={field} placeholder="support@agency.com" /></Setting></div> : null}
      {tab === "Branding" ? <div className="grid gap-6 md:grid-cols-2"><Setting label="Agency logo"><div className="mt-2 flex items-center gap-4">{settings.logoUrl ? <img src={settings.logoUrl} alt="Agency logo" className="h-16 w-16 rounded-2xl border border-white/10 object-contain p-2" /> : <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-white/20 text-xs text-mist">Logo</div>}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => void uploadLogo(e.target.files?.[0])} className="text-xs text-mist file:mr-3 file:rounded-full file:border-0 file:bg-cyberBlue file:px-4 file:py-2 file:font-semibold file:text-ink" /></div></Setting><Setting label="Primary color"><div className="mt-2 flex gap-3"><input type="color" value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor:e.target.value})} className="h-12 w-16 rounded-lg bg-transparent" /><input value={settings.primaryColor} onChange={e => setSettings({...settings, primaryColor:e.target.value})} className={field.replace("mt-2 ", "")} /></div></Setting><div className="md:col-span-2"><Setting label="Custom footer"><textarea rows={3} value={settings.customFooter ?? ""} onChange={e => setSettings({...settings, customFooter:e.target.value})} className={field} placeholder="Delivered with care by your agency." /></Setting></div></div> : null}
      {tab === "Domain" ? <div><Setting label="Custom domain"><input value={settings.customDomain ?? ""} onChange={e => setSettings({...settings, customDomain:e.target.value})} className={field} placeholder="client.agency.com" /></Setting><div className="mt-4 rounded-2xl border border-amber-300/15 bg-amber-300/[.05] p-4 text-sm text-mist"><span className="font-semibold text-amber-200">Status: {settings.domainStatus}</span><p className="mt-2">Configuration is stored now. DNS verification and routing will be enabled in a future phase.</p></div></div> : null}
      {tab === "Security" ? <div className="max-w-lg"><Setting label="Session timeout"><select value={settings.sessionTimeoutMinutes} onChange={e => setSettings({...settings, sessionTimeoutMinutes:Number(e.target.value)})} className={field}><option value={60}>1 hour</option><option value={480}>8 hours</option><option value={1440}>24 hours</option><option value={10080}>7 days</option></select></Setting><div className="mt-5 rounded-2xl border border-white/10 bg-ink/45 p-4 text-sm text-mist">Role-based access is enforced on the server. Owners and admins manage workspace security and member access.</div></div> : null}
      <div className="mt-7 flex items-center gap-4"><button disabled={saving} className="rounded-full bg-cyberBlue px-6 py-3 text-sm font-bold text-ink disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>{message ? <p className="text-sm text-mist" role="status">{message}</p> : null}</div>
    </form>
  </section>;
}
function Setting({ label, children }: { label: string; children: React.ReactNode }) { return <label className="text-sm font-medium text-frost">{label}{children}</label>; }
