"use client";

import { useRef, useState, type FormEvent } from "react";

export function DemoForm() {
  const [state, setState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const submittedAt = useRef(Date.now());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const response = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await response.json() as { error?: string };
    if (!response.ok) {
      setError(result.error ?? "Unable to book your demo right now.");
      setState("error");
      return;
    }
    form.reset();
    setState("success");
  }

  if (state === "success") {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center sm:p-12" role="status">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-2xl text-emerald-300">✓</div>
        <h2 className="mt-5 text-2xl font-semibold text-frost">Your demo is on our radar.</h2>
        <p className="mt-3 text-mist">We’ll review your workflow and reach out shortly with the right next step.</p>
        <button type="button" onClick={() => setState("idle")} className="mt-6 text-sm font-semibold text-cyberBlue hover:text-frost">Submit another request</button>
      </div>
    );
  }

  const inputClass = "workspace-input mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-frost outline-none transition placeholder:text-mist/50 focus:border-cyberBlue/50";
  return (
    <form onSubmit={submit} className="glass-panel rounded-3xl p-5 sm:p-8">
      <input type="hidden" name="submittedAt" value={submittedAt.current} />
      <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Name" name="name" required className={inputClass} autoComplete="name" />
        <Field label="Work email" name="email" type="email" required className={inputClass} autoComplete="email" />
        <Field label="Company" name="company" required className={inputClass} autoComplete="organization" />
        <Field label="Phone" name="phone" type="tel" className={inputClass} autoComplete="tel" />
        <label className="text-sm font-medium text-frost sm:col-span-2">Agency size
          <select name="agencySize" required defaultValue="" className={inputClass}>
            <option value="" disabled>Select your team size</option>
            <option>Just me</option><option>2–5 people</option><option>6–15 people</option><option>16–50 people</option><option>51+ people</option>
          </select>
        </label>
        <label className="text-sm font-medium text-frost sm:col-span-2">What would you like to streamline?
          <textarea name="message" rows={5} className={inputClass} placeholder="Tell us about your clients, content volume, or current workflow." />
        </label>
      </div>
      {state === "error" ? <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p> : null}
      <button disabled={state === "submitting"} className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-violetGlow to-cyberBlue px-6 py-3.5 text-sm font-bold text-white shadow-glow transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">
        {state === "submitting" ? "Booking your demo…" : "Book my demo"}
      </button>
      <p className="mt-4 text-center text-xs leading-5 text-mist/70">No sales theatre. Just a focused look at how ReelMind fits your agency.</p>
    </form>
  );
}

function Field(props: { label: string; name: string; type?: string; required?: boolean; className: string; autoComplete: string }) {
  const { label, ...inputProps } = props;
  return <label className="text-sm font-medium text-frost">{label}<input {...inputProps} aria-label={label} /></label>;
}
