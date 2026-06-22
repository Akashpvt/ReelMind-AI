"use client";
/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { BackgroundEffects } from "@/components/effects/background-effects";
import type { WorkspaceBranding } from "@/lib/team/branding";

const DashboardPreview = dynamic(
  () => import("@/components/sections/dashboard-preview").then((module) => module.DashboardPreview),
  {
    ssr: false,
    loading: () => (
      <div className="relative z-10 mx-auto flex min-h-[72vh] max-w-7xl items-center justify-center px-4 pt-28">
        <div className="glass-panel flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-mist/75">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyberBlue/25 border-t-cyberBlue" />
          Loading creator workspace
        </div>
      </div>
    ),
  },
);

type DashboardWorkspaceProps = {
  email: string;
  userId: string;
  branding: WorkspaceBranding | null;
};

export function DashboardWorkspace({ email, userId, branding }: DashboardWorkspaceProps) {
  return (
    <main className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-ink text-frost" style={{ "--workspace-accent": branding?.primaryColor ?? "#38BDF8" } as CSSProperties}>
      <BackgroundEffects />

      <motion.header
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-40 px-2 pt-2 sm:px-4 sm:pt-3"
      >
        <nav className="nav-glass nav-glass-scrolled mx-auto flex w-full items-center justify-between gap-2 rounded-2xl px-2.5 py-2 sm:gap-3 sm:rounded-full sm:px-4 sm:py-2.5 lg:max-w-7xl">
          <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2" aria-label="Back to ReelMind AI home">
            {branding?.logoUrl ? <><img src={branding.logoUrl} alt="" className="h-9 w-9 rounded-xl object-contain" /></> : <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink shadow-glow sm:h-9 sm:w-9">
              <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-violetGlow to-cyberBlue opacity-70 blur-md" />
              <span className="relative text-sm font-black">RM</span>
            </span>}
            <span className="hidden text-sm font-bold tracking-wide text-frost sm:block">
              {branding?.agencyName ?? "ReelMind AI"}
            </span>
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyberBlue/75">Workspace</p>
              <p className="max-w-[15rem] truncate text-xs text-mist/80">{email}</p>
            </div>
            <LogoutButton />
          </div>
        </nav>
      </motion.header>

      <DashboardPreview userId={userId} />
    </main>
  );
}
