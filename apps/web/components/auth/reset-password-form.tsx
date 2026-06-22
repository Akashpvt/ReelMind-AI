"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ensureUserRecords } from "@/lib/auth/ensure-user-records";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("Open the password reset link from your email before setting a new password.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      await ensureUserRecords(supabase, userData.user);
      setSuccess("Password updated. Redirecting to your dashboard...");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 800);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Unable to update password.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <AnimatePresence mode="popLayout">
        {success ? (
          <motion.p
            key="reset-success"
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
            key="reset-error"
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
        <span className="mb-2 block text-sm font-medium text-mist/85">New password</span>
        <input
          required
          minLength={6}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="At least 6 characters"
          className="w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-mist/35 hover:border-white/[0.16] focus:border-cyberBlue/50 focus:bg-white/[0.055] focus:shadow-[0_0_0_3px_rgba(18,181,255,0.11)]"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-mist/85">Confirm password</span>
        <input
          required
          minLength={6}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repeat your new password"
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
            Updating password...
          </>
        ) : (
          "Update password"
        )}
      </motion.button>
    </form>
  );
}
