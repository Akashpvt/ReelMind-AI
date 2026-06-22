"use client";

import { AnimatePresence, motion } from "framer-motion";
import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });

      if (resetError) throw resetError;
      setSuccess("Password reset email sent. Check your inbox for the secure link.");
      setEmail("");
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to send reset email.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <AnimatePresence mode="popLayout">
        {success ? (
          <motion.p
            key="forgot-success"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="status"
            className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm leading-6 text-emerald-100"
          >
            {success}
          </motion.p>
        ) : null}
        {error ? (
          <motion.p
            key="forgot-error"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            role="alert"
            className="rounded-xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm leading-6 text-rose-100"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-mist/85">Email</span>
        <input
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="creator@studio.com"
          className="w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-mist/35 hover:border-white/[0.16] focus:border-cyberBlue/50 focus:bg-white/[0.055] focus:shadow-[0_0_0_3px_rgba(18,181,255,0.11)]"
        />
      </label>

      <motion.button
        type="submit"
        disabled={isLoading}
        whileHover={isLoading ? undefined : { scale: 1.01 }}
        whileTap={isLoading ? undefined : { scale: 0.985 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violetGlow to-cyberBlue px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(86,59,247,0.3)] transition-shadow hover:shadow-[0_16px_38px_rgba(18,181,255,0.34)] disabled:cursor-wait disabled:opacity-75"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            Sending reset link...
          </>
        ) : (
          "Send reset link"
        )}
      </motion.button>
    </form>
  );
}
