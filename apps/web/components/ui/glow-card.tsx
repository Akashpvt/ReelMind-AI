"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type GlowCardProps = {
  children: ReactNode;
  className?: string;
};

export function GlowCard({ children, className }: GlowCardProps) {
  return (
    <motion.div
      whileHover={{ y: -8, rotateX: 3.5, rotateY: -3.5, scale: 1.008 }}
      transition={{ type: "spring", stiffness: 190, damping: 24 }}
      className={cn(
        "glass-panel neon-border animated-surface group relative flex h-full flex-col overflow-hidden rounded-3xl p-6 transform-gpu transition-shadow duration-500 hover:shadow-[0_24px_90px_rgba(88,28,135,0.28)]",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-cyberBlue/70 to-transparent" />
      <div className="absolute -right-16 -top-16 z-[1] h-36 w-36 rounded-full bg-violetGlow/20 blur-3xl transition duration-500 group-hover:bg-cyberBlue/20" />
      <div className="absolute inset-0 z-[1] opacity-0 transition duration-500 group-hover:opacity-100">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.08] to-transparent" />
      </div>
      <div className="relative z-[2] flex h-full flex-col">{children}</div>
    </motion.div>
  );
}
