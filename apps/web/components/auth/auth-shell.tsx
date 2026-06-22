"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  alternateText: string;
  alternateLabel: string;
  alternateHref: string;
};

const studioSignals = [
  "Viral hooks and complete reel packages",
  "AI-assisted scripting in your creator voice",
  "Projects saved to your private workspace",
];

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  alternateText,
  alternateLabel,
  alternateHref,
}: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink px-4 py-5 text-white sm:px-6 sm:py-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(135,74,255,0.22),transparent_33%),radial-gradient(circle_at_82%_28%,rgba(18,181,255,0.16),transparent_31%),radial-gradient(circle_at_50%_95%,rgba(90,51,200,0.14),transparent_34%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(155,164,202,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(155,164,202,0.06)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:radial-gradient(circle_at_center,black,transparent_76%)]" />

      <div className="relative mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.92fr_1fr]">
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="hidden pl-5 lg:block"
        >
          <Link href="/" className="mb-14 inline-flex items-center gap-3" aria-label="ReelMind AI home">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyberBlue/30 bg-white/[0.06] shadow-[0_0_30px_rgba(18,181,255,0.16)]">
              <span className="h-5 w-5 rounded-full bg-gradient-to-br from-violetGlow to-cyberBlue shadow-[0_0_18px_rgba(135,74,255,0.75)]" />
            </span>
            <span className="text-lg font-semibold tracking-[0.08em]">REELMIND AI</span>
          </Link>

          <p className="mb-5 text-xs font-medium uppercase tracking-[0.34em] text-cyberBlue/90">
            Creator workspace
          </p>
          <h2 className="max-w-[32rem] text-4xl font-semibold leading-[1.12] text-white">
            Turn one idea into your next standout reel.
          </h2>
          <p className="mt-5 max-w-[29rem] text-base leading-7 text-mist/80">
            A focused studio for hooks, scripts, captions, prompts, and projects built
            to move at creator speed.
          </p>

          <div className="mt-10 space-y-3">
            {studioSignals.map((signal, index) => (
              <motion.div
                key={signal}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + index * 0.09, duration: 0.42 }}
                className="flex items-center gap-3 text-sm text-mist/85"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyberBlue shadow-[0_0_10px_rgba(18,181,255,0.9)]" />
                {signal}
              </motion.div>
            ))}
          </div>
        </motion.aside>

        <motion.section
          initial={{ opacity: 0, y: 18, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="glass-panel relative mx-auto w-full max-w-[30rem] overflow-hidden rounded-[1.55rem] border border-white/[0.1] p-5 shadow-[0_28px_95px_rgba(0,0,0,0.44),0_0_70px_rgba(91,45,197,0.13)] sm:p-8"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyberBlue/65 to-transparent" />
          <Link href="/" className="mb-8 inline-flex items-center gap-2.5 lg:hidden" aria-label="ReelMind AI home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyberBlue/30 bg-white/[0.05]">
              <span className="h-4 w-4 rounded-full bg-gradient-to-br from-violetGlow to-cyberBlue shadow-[0_0_15px_rgba(135,74,255,0.7)]" />
            </span>
            <span className="text-sm font-semibold tracking-[0.12em]">REELMIND AI</span>
          </Link>

          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyberBlue/90">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-[1.85rem] font-semibold leading-[1.18] text-white sm:text-[2.15rem]">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-mist/75">{description}</p>

          <div className="mt-8">{children}</div>

          <p className="mt-7 text-center text-sm text-mist/65">
            {alternateText}{" "}
            <Link
              href={alternateHref}
              className="font-medium text-cyberBlue transition-colors hover:text-white"
            >
              {alternateLabel}
            </Link>
          </p>
        </motion.section>
      </div>
    </main>
  );
}
