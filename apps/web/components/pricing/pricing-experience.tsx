"use client";

import Link from "next/link";
import { useState } from "react";
import { freePlan, paidPlans } from "@/lib/payments/razorpay-plans";

type BillingCycle = "monthly" | "yearly";
const planData = [
  { ...freePlan, featured: false, features: ["Core AI creation tools", "Basic CRM", "3 active projects", "1 workspace seat"] },
  { ...paidPlans.starter, featured: false, features: ["1,000 monthly credits", "50 CRM leads", "10 active projects", "3 team seats"] },
  { ...paidPlans.pro, featured: true, features: ["5,000 monthly credits", "Client approval portal", "Advanced analytics", "10 team seats"] },
  { ...paidPlans.agency, featured: false, features: ["20,000 monthly credits", "High-volume delivery", "Priority support", "50 team seats"] },
];
const comparison = [
  ["AI credits", "20", "1,000", "5,000", "20,000"], ["CRM leads", "10", "50", "250", "1,000"],
  ["Active projects", "3", "10", "50", "250"], ["Team seats", "1", "3", "10", "50"],
  ["Client portal", "—", "Basic", "Full", "Full"], ["Analytics", "Basic", "Basic", "Advanced", "Advanced"],
  ["File storage", "100 MB", "1 GB", "10 GB", "100 GB"], ["Priority support", "—", "—", "—", "Included"],
];

function money(amount: number) { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount); }

export function PricingExperience() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  return <main className="relative min-h-screen overflow-hidden bg-ink px-4 pb-20 pt-5 text-frost sm:px-6">
    <div className="grid-mask pointer-events-none fixed inset-0 opacity-35" /><div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(168,85,247,.2),transparent_30rem),radial-gradient(circle_at_82%_22%,rgba(56,189,248,.16),transparent_30rem)]" />
    <nav className="nav-glass nav-glass-scrolled relative mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 py-2.5"><Link href="/" className="font-semibold">ReelMind AI</Link><div className="flex items-center gap-4 text-sm"><Link href="/demo" className="text-mist hover:text-frost">Demo</Link><Link href="/login" className="rounded-full border border-white/10 px-4 py-2 hover:border-cyberBlue/40">Login</Link></div></nav>
    <section className="relative mx-auto max-w-7xl pb-14 pt-16 text-center sm:pt-24"><p className="text-xs font-bold uppercase tracking-[.25em] text-cyberBlue">Simple, scalable pricing</p><h1 className="shine-text mx-auto mt-5 max-w-4xl text-5xl font-semibold tracking-[-.055em] sm:text-7xl">Start lean. Scale without switching systems.</h1><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-mist">Every plan connects creation, clients, delivery, and growth. Upgrade when your volume—not your tool stack—demands it.</p>
      <div className="mt-8 inline-flex rounded-full border border-white/10 bg-white/[.04] p-1" aria-label="Billing cycle"><button onClick={() => setCycle("monthly")} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${cycle === "monthly" ? "bg-white text-ink" : "text-mist"}`}>Monthly</button><button onClick={() => setCycle("yearly")} className={`rounded-full px-5 py-2 text-sm font-semibold transition ${cycle === "yearly" ? "bg-white text-ink" : "text-mist"}`}>Yearly <span className={cycle === "yearly" ? "text-violet-700" : "text-cyberBlue"}>−20%</span></button></div>
    </section>
    <section className="relative mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">{planData.map(plan => { const amount = cycle === "yearly" ? Math.round(plan.amount * .8) : plan.amount; return <article key={plan.id} className={`relative flex flex-col rounded-3xl border p-6 ${plan.featured ? "border-cyberBlue/50 bg-cyberBlue/[.08] shadow-[0_0_50px_rgba(56,189,248,.1)]" : "border-white/10 bg-white/[.035]"}`}>{plan.featured ? <span className="absolute right-5 top-5 rounded-full bg-cyberBlue/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-cyberBlue">Most popular</span> : null}<h2 className="text-2xl font-semibold">{plan.name}</h2><p className="mt-3 min-h-12 text-sm leading-6 text-mist">{plan.description}</p><div className="mt-6"><span className="text-4xl font-semibold">{plan.amount === 0 ? "Free" : money(amount)}</span>{plan.amount > 0 ? <span className="text-sm text-mist"> / month</span> : null}</div>{cycle === "yearly" && plan.amount > 0 ? <p className="mt-2 text-xs text-cyberBlue">Billed {money(amount * 12)} yearly</p> : <div className="h-6" />}<Link href={plan.id === "free" ? "/signup" : `/billing?plan=${plan.id}&cycle=${cycle}`} className={`mt-6 rounded-full px-4 py-3 text-center text-sm font-bold transition ${plan.featured ? "bg-gradient-to-r from-violetGlow to-cyberBlue text-white" : "border border-white/10 hover:border-cyberBlue/40"}`}>{plan.id === "free" ? "Start Free" : `Upgrade to ${plan.name}`}</Link><div className="mt-7 space-y-3">{plan.features.map(feature => <p key={feature} className="flex gap-2 text-sm text-mist"><span className="text-cyberBlue">✓</span>{feature}</p>)}</div></article>})}</section>
    <section className="relative mx-auto mt-20 max-w-7xl"><div className="text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-cyberBlue">Compare plans</p><h2 className="mt-4 text-4xl font-semibold tracking-[-.04em]">Everything you need to choose.</h2></div><div className="mt-8 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.03]"><div className="min-w-[720px]"><div className="grid grid-cols-5 bg-white/[.04] px-5 py-4 text-xs font-bold uppercase tracking-[.14em] text-mist"><span>Feature</span>{planData.map(p => <span key={p.id}>{p.name}</span>)}</div>{comparison.map(row => <div key={row[0]} className="grid grid-cols-5 border-t border-white/[.08] px-5 py-4 text-sm"><span className="font-medium">{row[0]}</span>{row.slice(1).map((cell, i) => <span key={`${row[0]}-${i}`} className="text-mist">{cell}</span>)}</div>)}</div></div></section>
    <section className="relative mx-auto mt-16 max-w-4xl rounded-3xl border border-violetGlow/25 bg-violetGlow/[.06] p-8 text-center"><h2 className="text-3xl font-semibold">Need help mapping the right plan?</h2><p className="mt-3 text-mist">We’ll look at your team, client volume, and production workflow.</p><Link href="/demo" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-bold text-ink">Book a demo</Link></section>
  </main>;
}
