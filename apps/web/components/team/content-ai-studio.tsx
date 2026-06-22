"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { downloadDocx, downloadPdf } from "@/lib/content-ai/export";
import type { ContentGenerationType, ContentOutput } from "@/lib/content-ai/types";

type Generation = { id: string; generation_type: ContentGenerationType; provider: string; model: string; input: Record<string, unknown>; output: ContentOutput; status: string; created_at: string };
type Calendar = { id: string; title: string; client_name: string | null; start_date: string; end_date: string; platforms: string[]; entries: ContentOutput["calendar"]; status: string; created_at: string };
type Report = { id: string; report_type: string; title: string; client_name: string | null; executive_summary: string; content: ContentOutput; status: string; created_at: string };
type StudioData = { generations: Generation[]; calendars: Calendar[]; reports: Report[]; brand: { agency_name: string | null; primary_color: string | null } | null };

const tools: Array<{ type: ContentGenerationType; label: string; description: string; icon: string }> = [
  { type: "script", label: "Script Generator", description: "Retention-shaped video scripts", icon: "SC" },
  { type: "hook", label: "Hook Generator", description: "Pattern interrupts and angles", icon: "HK" },
  { type: "caption", label: "Caption Generator", description: "Platform-ready social copy", icon: "CP" },
  { type: "hashtags", label: "Hashtag Generator", description: "Niche discovery sets", icon: "#" },
  { type: "thumbnail_concepts", label: "Thumbnail Concepts", description: "Click-worthy visual directions", icon: "TH" },
  { type: "content_calendar", label: "Content Calendar", description: "7–30 day publishing plans", icon: "CL" },
  { type: "brand_analysis", label: "Brand Analysis", description: "Positioning, voice, and pillars", icon: "BA" },
  { type: "strategy_report", label: "Client Strategy Report", description: "Client-ready strategic plans", icon: "SR" },
];
const toolName = (type: string) => tools.find(tool => tool.type === type)?.label ?? type.replaceAll("_", " ");

export function ContentAiStudio({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<StudioData | null>(null);
  const [type, setType] = useState<ContentGenerationType>("script");
  const [provider, setProvider] = useState("auto");
  const [topic, setTopic] = useState("");
  const [brand, setBrand] = useState("");
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("Confident, premium, clear");
  const [platform, setPlatform] = useState("Instagram");
  const [objective, setObjective] = useState("Build trust and generate qualified demand");
  const [clientName, setClientName] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(14);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [view, setView] = useState<"create" | "library" | "calendars" | "reports">("create");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/content-ai?organizationId=${organizationId}`);
    const payload = await response.json() as StudioData & { error?: string };
    if (response.ok) {
      setData(payload);
      setBrand(current => current || payload.brand?.agency_name || "");
    } else setMessage(payload.error ?? "Unable to load the content studio. Apply migration 046 if the tables are not available yet.");
    setLoading(false);
  }, [organizationId]);
  useEffect(() => { void load(); }, [load]);

  async function generate(event: FormEvent) {
    event.preventDefault(); setGenerating(true); setMessage("");
    const response = await fetch("/api/content-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, type, provider, topic, brand, audience, tone, platform, objective, clientName, startDate, days }) });
    const payload = await response.json() as { generation?: Generation; error?: string };
    if (response.ok && payload.generation) {
      setSelected(payload.generation); setMessage(payload.generation.provider === "local" ? "Generated with ReelMind's local template engine. Add a provider key whenever you want model-powered variations." : `Generated with ${payload.generation.provider}.`);
      await load(); setSelected(payload.generation);
    } else setMessage(payload.error ?? "Generation failed.");
    setGenerating(false);
  }

  async function exportOutput(format: "pdf" | "docx", generation: Generation) {
    if (format === "pdf") downloadPdf(generation.output); else downloadDocx(generation.output);
    await fetch("/api/content-ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationId, operation: "export", generationId: generation.id, format }) });
    setMessage(`${format.toUpperCase()} export downloaded.`);
  }

  const activeTool = useMemo(() => tools.find(tool => tool.type === type)!, [type]);
  return <div className="space-y-5">
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[.035] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-[.22em] text-cyberBlue">Creative operating layer</p><p className="mt-2 text-sm text-mist">Provider-aware generation with a built-in no-key fallback.</p></div>
      <div className="flex flex-wrap gap-2">{(["create", "library", "calendars", "reports"] as const).map(item => <button key={item} onClick={() => setView(item)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${view === item ? "bg-cyberBlue text-ink" : "border border-white/10 text-mist hover:text-frost"}`}>{item}</button>)}</div>
    </div>
    {message ? <p role="status" className="rounded-2xl border border-cyberBlue/20 bg-cyberBlue/[.06] px-4 py-3 text-sm text-mist">{message}</p> : null}
    {view === "create" ? <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{tools.map(tool => <button key={tool.type} onClick={() => { setType(tool.type); setSelected(null); }} className={`group rounded-2xl border p-4 text-left transition ${type === tool.type ? "border-cyberBlue/50 bg-cyberBlue/[.08] shadow-[0_0_30px_rgba(56,189,248,.08)]" : "border-white/10 bg-white/[.025] hover:border-white/20"}`}><span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violetGlow/25 to-cyberBlue/20 px-2 text-[10px] font-black text-cyberBlue">{tool.icon}</span><h2 className="mt-3 text-sm font-semibold text-frost">{tool.label}</h2><p className="mt-1 text-xs text-mist">{tool.description}</p></button>)}</div>
      <section className="grid gap-5 lg:grid-cols-[.78fr_1.22fr]">
        <form onSubmit={generate} className="rounded-3xl border border-white/10 bg-white/[.035] p-5">
          <p className="text-xs font-bold uppercase tracking-[.2em] text-violetGlow">{activeTool.label}</p><h3 className="mt-2 text-xl font-semibold text-frost">Build the brief</h3>
          <div className="mt-5 space-y-4"><Field label="Topic or campaign brief"><textarea value={topic} onChange={event => setTopic(event.target.value)} required rows={4} placeholder="Launch a founder-led content series for sustainable D2C growth…" className="content-ai-input resize-none" /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Brand"><input value={brand} onChange={event => setBrand(event.target.value)} placeholder="Brand name" className="content-ai-input" /></Field><Field label="Client"><input value={clientName} onChange={event => setClientName(event.target.value)} placeholder="Optional client name" className="content-ai-input" /></Field></div>
            <Field label="Audience"><input value={audience} onChange={event => setAudience(event.target.value)} placeholder="Who should this move?" className="content-ai-input" /></Field>
            <Field label="Objective"><input value={objective} onChange={event => setObjective(event.target.value)} className="content-ai-input" /></Field>
            <div className="grid gap-3 sm:grid-cols-2"><Field label="Platform"><select value={platform} onChange={event => setPlatform(event.target.value)} className="content-ai-input"><option>Instagram</option><option>LinkedIn</option><option>YouTube</option><option>Facebook</option><option>Multi-platform</option></select></Field><Field label="AI Provider"><select value={provider} onChange={event => setProvider(event.target.value)} className="content-ai-input"><option value="auto">Auto / fallback</option><option value="openai">OpenAI</option><option value="gemini">Gemini</option><option value="claude">Claude</option></select></Field></div>
            <Field label="Tone"><input value={tone} onChange={event => setTone(event.target.value)} className="content-ai-input" /></Field>
            {type === "content_calendar" ? <div className="grid gap-3 sm:grid-cols-2"><Field label="Start date"><input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="content-ai-input" /></Field><Field label="Plan length"><select value={days} onChange={event => setDays(Number(event.target.value))} className="content-ai-input"><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></Field></div> : null}
          </div><button disabled={generating} className="mt-5 w-full rounded-full bg-gradient-to-r from-violetGlow to-cyberBlue px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{generating ? "Generating strategy…" : `Generate ${activeTool.label}`}</button>
        </form>
        <OutputPanel generation={selected} generating={generating} onExport={exportOutput} />
      </section>
    </> : null}
    {view === "library" ? <Library loading={loading} generations={data?.generations ?? []} onOpen={generation => { setSelected(generation); setType(generation.generation_type); setView("create"); }} onExport={exportOutput} /> : null}
    {view === "calendars" ? <CalendarLibrary items={data?.calendars ?? []} /> : null}
    {view === "reports" ? <ReportLibrary items={data?.reports ?? []} /> : null}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[.16em] text-mist">{label}</span>{children}</label>; }
function OutputPanel({ generation, generating, onExport }: { generation: Generation | null; generating: boolean; onExport: (format: "pdf" | "docx", generation: Generation) => void }) { if (generating) return <div className="flex min-h-[34rem] items-center justify-center rounded-3xl border border-cyberBlue/20 bg-[radial-gradient(circle_at_center,rgba(56,189,248,.12),transparent_55%)]"><div className="text-center"><span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-cyberBlue/20 border-t-cyberBlue"/><p className="mt-4 text-sm text-mist">Shaping the brief into something useful…</p></div></div>; if (!generation) return <div className="flex min-h-[34rem] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[.02] p-8 text-center"><div><p className="text-4xl text-cyberBlue/50">✦</p><h3 className="mt-4 text-xl font-semibold">Your output appears here</h3><p className="mt-2 max-w-sm text-sm leading-6 text-mist">Choose a tool, give it a clear brief, and ReelMind will create an editable, export-ready asset.</p></div></div>; const output = generation.output; return <article className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.02))] p-5 sm:p-7"><div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-cyberBlue/25 bg-cyberBlue/[.08] px-2.5 py-1 text-[10px] font-bold uppercase text-cyberBlue">{generation.provider}</span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-mist">{toolName(generation.generation_type)}</span></div><h2 className="mt-4 text-2xl font-semibold text-frost">{output.title}</h2><p className="mt-2 text-sm leading-6 text-mist">{output.summary}</p></div><div className="flex shrink-0 gap-2"><button onClick={() => void onExport("pdf", generation)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-frost hover:border-cyberBlue/30">PDF</button><button onClick={() => void onExport("docx", generation)} className="rounded-full border border-white/10 px-3 py-2 text-xs text-frost hover:border-cyberBlue/30">DOCX</button></div></div><div className="mt-5 space-y-5">{output.sections.map(section => <section key={section.heading}><h3 className="text-xs font-bold uppercase tracking-[.18em] text-violetGlow">{section.heading}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-200">{section.content}</p></section>)}{output.calendar ? <div className="overflow-x-auto rounded-2xl border border-white/10"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-white/[.05] text-cyberBlue"><tr><th className="p-3">Date</th><th className="p-3">Format</th><th className="p-3">Theme & hook</th><th className="p-3">CTA</th></tr></thead><tbody>{output.calendar.map(item => <tr key={`${item.date}-${item.theme}`} className="border-t border-white/10"><td className="p-3 text-mist">{item.date}</td><td className="p-3 text-frost">{item.format}</td><td className="p-3"><strong className="block text-frost">{item.theme}</strong><span className="mt-1 block text-mist">{item.hook}</span></td><td className="p-3 text-mist">{item.cta}</td></tr>)}</tbody></table></div> : null}</div></article>; }
function Library({ loading, generations, onOpen, onExport }: { loading: boolean; generations: Generation[]; onOpen: (item: Generation) => void; onExport: (format: "pdf" | "docx", item: Generation) => void }) { return <section className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><h2 className="text-xl font-semibold">Generation library</h2><p className="mt-2 text-sm text-mist">Every completed output, provider, and export in one place.</p><div className="mt-5 grid gap-3 md:grid-cols-2">{loading ? <p className="text-mist">Loading studio history…</p> : generations.length ? generations.map(item => <article key={item.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase text-cyberBlue">{toolName(item.generation_type)}</span><span className="text-[10px] uppercase text-mist">{item.provider}</span></div><h3 className="mt-3 font-semibold">{item.output.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-mist">{item.output.summary}</p><div className="mt-4 flex gap-2"><button onClick={() => onOpen(item)} className="rounded-full bg-cyberBlue px-3 py-1.5 text-xs font-bold text-ink">Open</button><button onClick={() => void onExport("pdf", item)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist">PDF</button><button onClick={() => void onExport("docx", item)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-mist">DOCX</button></div></article>) : <p className="text-mist">No generations yet.</p>}</div></section>; }
function CalendarLibrary({ items }: { items: Calendar[] }) { return <section className="space-y-4">{items.length ? items.map(item => <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyberBlue">{item.start_date} → {item.end_date}</p><h2 className="mt-2 text-xl font-semibold">{item.title}</h2><p className="mt-1 text-sm text-mist">{item.client_name || "Workspace plan"} · {item.platforms.join(", ")}</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist">{item.entries?.length ?? 0} ideas</span></div></article>) : <Empty text="Generate a content calendar and it will be saved here." />}</section>; }
function ReportLibrary({ items }: { items: Report[] }) { return <section className="grid gap-4 md:grid-cols-2">{items.length ? items.map(item => <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-5"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-violetGlow">{item.report_type.replaceAll("_", " ")}</span><h2 className="mt-3 text-xl font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-6 text-mist">{item.executive_summary}</p><p className="mt-4 text-xs text-cyberBlue">{item.client_name || "Workspace"}</p></article>) : <Empty text="Brand analyses and client strategy reports will appear here." />}</section>; }
function Empty({ text }: { text: string }) { return <p className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-sm text-mist">{text}</p>; }
