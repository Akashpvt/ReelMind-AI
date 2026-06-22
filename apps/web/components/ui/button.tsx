"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  variant?: "primary" | "secondary" | "ghost";
};

const variants = {
  primary:
    "cta-pulse relative overflow-hidden bg-frost text-ink shadow-[0_0_34px_rgba(168,85,247,0.42)] before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent before:transition before:duration-700 hover:-translate-y-0.5 hover:shadow-[0_0_56px_rgba(56,189,248,0.42)] hover:before:translate-x-full",
  secondary:
    "border border-white/15 bg-white/[0.06] text-frost backdrop-blur-xl hover:-translate-y-0.5 hover:border-cyberBlue/50 hover:bg-cyberBlue/10 hover:shadow-blue-glow",
  ghost: "text-mist hover:text-frost hover:bg-white/[0.04]",
};

export function Button({ children, href, className, variant = "primary", ...props }: ButtonProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 280, damping: 18, mass: 0.35 });
  const springY = useSpring(y, { stiffness: 280, damping: 18, mass: 0.35 });

  const handleMouseMove = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left - rect.width / 2) * 0.18);
    y.set((event.clientY - rect.top - rect.height / 2) * 0.22);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.025 }}
      whileTap={{ scale: 0.985 }}
      className={cn("inline-flex", className?.includes("w-full") && "w-full")}
    >
      <a
        href={href}
        className={cn(
          "group inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition duration-300",
          variants[variant],
          className,
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <span className="relative z-10">{children}</span>
      </a>
    </motion.div>
  );
}
