"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { ensureUserRecords } from "@/lib/auth/ensure-user-records";
import { createClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
  next?: string;
  confirmed?: boolean;
  initialError?: string;
};

function safeNextPath(next?: string) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export function AuthForm({ mode, next, confirmed = false, initialError }: AuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [error, setError] = useState(initialError ?? "");
  const [success, setSuccess] = useState(
    confirmed ? "Email confirmed. Sign in to enter your workspace." : "",
  );
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    const destination = safeNextPath(next);

    try {
      const supabase = createClient();

      if (isLogin) {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (loginError) {
          throw loginError;
        }

        await ensureUserRecords(supabase, data.user);
        router.push(destination);
        router.refresh();
        return;
      }

      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
          data: {
            full_name: fullName.trim() || null,
          },
        },
      });

      if (signupError) {
        throw signupError;
      }

      if (data.session) {
        await ensureUserRecords(supabase, data.user, {
          email: email.trim(),
          fullName: fullName.trim() || null,
        });
        router.push(destination);
        router.refresh();
        return;
      }

      setSuccess("Account created. Check your email to confirm your sign-up.");
      setPassword("");
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setIsOAuthLoading(true);
    setError("");
    setSuccess("");

    try {
      const supabase = createClient();
      const destination = safeNextPath(next);
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Google sign-in is unavailable. Check your Supabase provider settings.",
      );
      setIsOAuthLoading(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <AnimatePresence mode="popLayout">
        {success ? (
          <motion.p
            key="auth-success"
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
            key="auth-error"
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

      {!isLogin ? (
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-mist/85">Full name</span>
          <input
            required
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Your creator name"
            className="w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-mist/35 hover:border-white/[0.16] focus:border-cyberBlue/50 focus:bg-white/[0.055] focus:shadow-[0_0_0_3px_rgba(18,181,255,0.11)]"
          />
        </label>
      ) : null}

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

      {isLogin ? (
        <div className="-mt-2 text-right">
          <a href="/forgot-password" className="text-sm font-medium text-cyberBlue transition hover:text-white">
            Forgot password?
          </a>
        </div>
      ) : null}

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-mist/85">Password</span>
        <input
          required
          minLength={6}
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isLogin ? "Enter your password" : "At least 6 characters"}
          className="w-full rounded-xl border border-white/[0.09] bg-white/[0.035] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-mist/35 hover:border-white/[0.16] focus:border-cyberBlue/50 focus:bg-white/[0.055] focus:shadow-[0_0_0_3px_rgba(18,181,255,0.11)]"
        />
      </label>

      <motion.button
        type="submit"
        disabled={isLoading}
        whileHover={isLoading ? undefined : { scale: 1.01 }}
        whileTap={isLoading ? undefined : { scale: 0.985 }}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violetGlow to-cyberBlue px-5 py-3.5 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(86,59,247,0.3)] transition-shadow hover:shadow-[0_16px_38px_rgba(18,181,255,0.34)] disabled:cursor-wait disabled:opacity-75"
      >
        {isLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            {isLogin ? "Signing in..." : "Creating account..."}
          </>
        ) : isLogin ? (
          "Sign in"
        ) : (
          "Create account"
        )}
      </motion.button>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs uppercase tracking-[0.22em] text-mist/45">or</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <motion.button
        type="button"
        disabled={isLoading || isOAuthLoading}
        onClick={() => void handleGoogleLogin()}
        whileHover={isLoading || isOAuthLoading ? undefined : { scale: 1.01 }}
        whileTap={isLoading || isOAuthLoading ? undefined : { scale: 0.985 }}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.045] px-5 py-3.5 text-sm font-semibold text-white transition hover:border-cyberBlue/35 hover:bg-white/[0.07] disabled:cursor-wait disabled:opacity-75"
      >
        {isOAuthLoading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" />
            Connecting Google...
          </>
        ) : (
          "Continue with Google"
        )}
      </motion.button>
    </form>
  );
}
