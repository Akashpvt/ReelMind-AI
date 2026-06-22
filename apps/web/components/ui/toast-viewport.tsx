"use client";

import { AnimatePresence, motion } from "framer-motion";

export type ToastTone = "success" | "error" | "info";

export type ToastMessage = {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastViewportProps = {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
};

const toneStyles: Record<ToastTone, { dot: string; glow: string }> = {
  success: {
    dot: "bg-[#34D399] shadow-[0_0_14px_rgba(52,211,153,0.82)]",
    glow: "from-[#34D399]/30 via-cyberBlue/18",
  },
  error: {
    dot: "bg-[#FB7185] shadow-[0_0_14px_rgba(251,113,133,0.82)]",
    glow: "from-[#FB7185]/28 via-violetGlow/12",
  },
  info: {
    dot: "bg-cyberBlue shadow-[0_0_14px_rgba(56,189,248,0.9)]",
    glow: "from-cyberBlue/28 via-violetGlow/16",
  },
};

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-5 z-[80] flex flex-col items-stretch gap-3 sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-24 sm:w-[22rem]"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="toast-glass pointer-events-auto relative overflow-hidden rounded-2xl p-4"
              role={toast.tone === "error" ? "alert" : "status"}
            >
              <div
                className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${styles.glow} to-transparent`}
                aria-hidden="true"
              />
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-frost">{toast.title}</p>
                  {toast.description ? (
                    <p className="mt-1 text-xs leading-5 text-mist">{toast.description}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => onDismiss(toast.id)}
                  className="rounded-full p-1 text-mist transition hover:bg-white/10 hover:text-frost"
                  aria-label="Dismiss notification"
                >
                  <span className="block h-4 w-4 text-center text-sm leading-4">x</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
