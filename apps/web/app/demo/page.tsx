import Link from "next/link";
import { DemoForm } from "@/components/demo/demo-form";

export const metadata = { title: "Book a Demo | ReelMind AI", description: "See how ReelMind AI runs your agency workflow from lead to delivery." };

export default function DemoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink px-4 pb-16 pt-5 text-frost sm:px-6">
      <div className="grid-mask pointer-events-none fixed inset-0 opacity-40" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,.22),transparent_32rem),radial-gradient(circle_at_82%_28%,rgba(56,189,248,.18),transparent_28rem)]" />
      <nav className="nav-glass nav-glass-scrolled relative mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5">
        <Link href="/" className="font-semibold">ReelMind AI</Link>
        <div className="flex items-center gap-4 text-sm"><Link href="/pricing" className="text-mist hover:text-frost">Pricing</Link><Link href="/login" className="rounded-full border border-white/10 px-4 py-2 hover:border-cyberBlue/40">Login</Link></div>
      </nav>
      <section className="relative mx-auto grid max-w-6xl gap-10 pb-10 pt-16 lg:grid-cols-[.85fr_1.15fr] lg:items-start lg:pt-24">
        <div className="lg:sticky lg:top-28">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-cyberBlue">A better agency operating system</p>
          <h1 className="shine-text mt-5 text-5xl font-semibold leading-[.98] tracking-[-.05em] sm:text-6xl">See the whole client workflow click into place.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-mist">Bring leads, projects, AI production, approvals, files, invoices, and reporting into one calm workspace.</p>
          <div className="mt-8 grid gap-3 text-sm text-mist sm:grid-cols-2 lg:grid-cols-1">
            {["A walkthrough shaped around your agency", "Clear answers on migration and setup", "A practical plan for your first workflow"].map((item) => <div key={item} className="flex gap-3"><span className="text-cyberBlue">✦</span>{item}</div>)}
          </div>
        </div>
        <DemoForm />
      </section>
    </main>
  );
}
