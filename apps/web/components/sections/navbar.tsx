"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Demo", href: "/demo" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;
    const updateScrollState = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setIsScrolled(window.scrollY > 18));
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrollState);
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -28, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4"
    >
      <nav
        className={cn(
          "nav-glass relative mx-auto flex max-w-7xl items-center justify-between rounded-[1.45rem] px-3 py-2.5 transition-all duration-500 sm:rounded-full sm:px-4 sm:py-2.5",
          isScrolled && "nav-glass-scrolled",
        )}
      >
        <a href="#hero" className="flex min-w-0 items-center gap-2.5" onClick={() => setIsOpen(false)}>
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink shadow-glow sm:h-9 sm:w-9">
            <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-violetGlow to-cyberBlue opacity-70 blur-md" />
            <span className="relative text-sm font-black">RM</span>
          </span>
          <span className="text-sm font-bold tracking-wide text-frost">ReelMind AI</span>
        </a>

        <div className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-mist transition hover:text-frost"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <Button href="/login" variant="ghost" className="hidden px-4 sm:inline-flex">
            Login
          </Button>
          <Button href="/signup" className="px-4 py-2">
            Start Free
          </Button>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation menu"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-frost transition hover:border-cyberBlue/40 hover:bg-cyberBlue/10 sm:hidden"
        >
          <span className="relative h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                isOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                isOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                isOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            initial={{ opacity: 0, y: -12, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -12, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="nav-glass nav-glass-scrolled mx-auto mt-2 max-w-7xl overflow-hidden rounded-3xl p-3 sm:hidden"
          >
            <div className="grid gap-1">
              {links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-mist transition hover:bg-white/[0.06] hover:text-frost"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3">
              <Button href="/login" variant="secondary" onClick={() => setIsOpen(false)} className="w-full">
                Login
              </Button>
              <Button href="/signup" onClick={() => setIsOpen(false)} className="w-full">
                Start Free
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
