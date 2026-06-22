"use client";

import { useState } from "react";

export function FreePlanButton({ organizationId, disabled }: { organizationId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error" | "idle">("idle");

  async function downgrade() {
    setLoading(true);
    setMessage(null);
    const response = await fetch("/api/billing/change-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, planId: "free" }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      setTone("error");
      setMessage(payload.error ?? "Unable to change plan.");
      return;
    }
    setTone("success");
    setMessage("Plan changed to Free. Refreshing...");
    window.setTimeout(() => window.location.reload(), 700);
  }

  return (
    <div>
      <button type="button" disabled={disabled || loading} onClick={() => void downgrade()} className="mt-6 w-full rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-frost transition hover:border-cyberBlue/40 hover:text-cyberBlue disabled:opacity-60">
        {disabled ? "Current Plan" : loading ? "Changing..." : "Downgrade to Free"}
      </button>
      {message ? <p className={`mt-2 text-xs ${tone === "error" ? "text-[#FDA4AF]" : "text-[#86EFAC]"}`}>{message}</p> : null}
    </div>
  );
}
