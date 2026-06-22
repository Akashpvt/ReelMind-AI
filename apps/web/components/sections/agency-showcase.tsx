"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { fadeUp, staggerContainer } from "@/lib/animations";

const problems = ["Leads disappear across inboxes", "Production lives in scattered tools", "Client feedback arrives without context", "Profitability is visible too late"];
const solutions = ["A CRM connected to delivery", "AI-assisted content production", "A branded approval portal", "Live agency and client analytics"];
const workflow = ["Capture", "Plan", "Create", "Review", "Deliver", "Measure"];

export function AgencyShowcase() {
  return <>
    <section className="relative z-10 px-4 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
        <StoryPanel eyebrow="The problem" title="Agency growth creates operational drag." items={problems} tone="rose" />
        <StoryPanel eyebrow="The ReelMind solution" title="One connected system from lead to result." items={solutions} tone="cyan" />
      </div>
    </section>

    <section id="workflow" className="relative z-10 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionHeading eyebrow="Agency workflow" title="Every handoff stays attached to the work." description="Move from opportunity to delivery without rebuilding context at every stage." />
        <div className="glass-panel overflow-hidden rounded-3xl p-5 sm:p-8">
          <div className="grid gap-3 md:grid-cols-6">
            {workflow.map((step, index) => <div key={step} className="relative rounded-2xl border border-white/10 bg-white/[.035] p-4"><span className="text-xs font-bold text-cyberBlue">0{index + 1}</span><p className="mt-3 font-semibold text-frost">{step}</p>{index < 5 ? <span className="absolute -right-2 top-1/2 hidden text-cyberBlue md:block">→</span> : null}</div>)}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
            <div className="rounded-2xl border border-white/10 bg-[#070b16] p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.2em] text-violetGlow">Project board</p><h3 className="mt-2 text-xl font-semibold">Summer launch campaign</h3></div><span className="rounded-full bg-amber-300/10 px-3 py-1 text-xs text-amber-200">In review</span></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{["Script approved", "8 assets ready", "Client review"].map((item, i) => <div key={item} className="rounded-xl bg-white/[.045] p-4 text-sm text-mist"><span className="mb-3 block h-1 rounded-full bg-gradient-to-r from-violetGlow to-cyberBlue" style={{width: `${62 + i * 14}%`}} />{item}</div>)}</div></div>
            <div className="rounded-2xl border border-cyberBlue/20 bg-cyberBlue/[.055] p-5"><p className="text-xs uppercase tracking-[.2em] text-cyberBlue">AI copilot</p><p className="mt-4 text-lg font-semibold">12 deliverables are ready for client review.</p><p className="mt-3 text-sm leading-6 text-mist">The campaign is on pace. Two captions need a final brand check.</p></div>
          </div>
        </div>
      </div>
    </section>

    <section className="relative z-10 px-4 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
        <Preview title="A client portal that feels like your agency." eyebrow="Client portal" description="Share proofs, messages, files, invoices, and approval status through a clean, branded experience."><div className="grid gap-3 sm:grid-cols-3">{["Review cut v3", "Campaign files", "Invoice #1042"].map((x, i) => <div key={x} className="rounded-xl border border-white/10 bg-white/[.04] p-4"><span className={`block h-2 w-2 rounded-full ${i === 0 ? "bg-amber-300" : "bg-emerald-300"}`} /><p className="mt-4 text-sm font-medium">{x}</p><p className="mt-2 text-xs text-mist">{i === 0 ? "Awaiting feedback" : "Ready"}</p></div>)}</div></Preview>
        <Preview title="Know what is growing—and what is leaking." eyebrow="Analytics" description="See revenue, delivery health, team capacity, top clients, and pipeline movement without spreadsheet archaeology."><div className="flex h-36 items-end gap-2">{[38,58,46,72,64,88,82,96].map((h, i) => <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-violetGlow/40 to-cyberBlue" style={{height: `${h}%`}} />)}</div></Preview>
      </div>
    </section>

    <section className="relative z-10 px-4 py-20"><div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-cyberBlue/25 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,.24),transparent_42%),rgba(255,255,255,.04)] p-8 text-center sm:p-14"><p className="text-xs font-bold uppercase tracking-[.24em] text-cyberBlue">Your next operating rhythm</p><h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Less chasing. More creating, approving, and growing.</h2><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button href="/signup">Start Free</Button><Button href="/demo" variant="secondary">Book Demo</Button><Button href="/pricing" variant="ghost">View Pricing</Button></div></div></section>
  </>;
}

function StoryPanel({ eyebrow, title, items, tone }: { eyebrow: string; title: string; items: string[]; tone: "rose" | "cyan" }) { return <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{once:true}} className="glass-panel rounded-3xl p-6 sm:p-8"><p className={`text-xs font-bold uppercase tracking-[.22em] ${tone === "cyan" ? "text-cyberBlue" : "text-rose-300"}`}>{eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.035em]">{title}</h2><div className="mt-7 space-y-3">{items.map(item => <motion.div variants={fadeUp} key={item} className="flex gap-3 rounded-xl border border-white/[.08] bg-white/[.03] p-4 text-mist"><span className={tone === "cyan" ? "text-cyberBlue" : "text-rose-300"}>{tone === "cyan" ? "✓" : "×"}</span>{item}</motion.div>)}</div></motion.div> }
function Preview({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) { return <div className="glass-panel rounded-3xl p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.22em] text-cyberBlue">{eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-[-.035em]">{title}</h2><p className="mt-4 leading-7 text-mist">{description}</p><div className="mt-8 rounded-2xl border border-white/10 bg-[#060914] p-4 sm:p-5">{children}</div></div> }
