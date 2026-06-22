"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void fetch("/api/security/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, route: window.location.pathname }) }); }, [error]);
  return <html lang="en"><body className="flex min-h-screen items-center justify-center bg-[#050913] p-6 text-slate-100"><main className="max-w-lg rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center"><p className="text-xs font-bold uppercase tracking-[.24em] text-sky-400">ReelMind AI</p><h1 className="mt-4 text-3xl font-semibold">Something went sideways.</h1><p className="mt-3 text-sm leading-6 text-slate-400">The error was recorded securely. You can retry without losing your account session.</p><button onClick={reset} className="mt-6 rounded-full bg-sky-400 px-5 py-2.5 text-sm font-bold text-slate-950">Try again</button></main></body></html>;
}
