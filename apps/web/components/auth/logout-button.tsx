"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setIsLoading(true);
    setError("");

    try {
      const supabase = createClient();
      const { error: logoutError } = await supabase.auth.signOut();

      if (logoutError) {
        throw logoutError;
      }

      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Unable to sign out.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1">
      <motion.button
        type="button"
        disabled={isLoading}
        onClick={handleLogout}
        whileHover={isLoading ? undefined : { scale: 1.02 }}
        whileTap={isLoading ? undefined : { scale: 0.98 }}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-mist transition hover:border-cyberBlue/35 hover:bg-white/[0.07] hover:text-white disabled:opacity-65 sm:px-3.5 sm:py-2 sm:text-sm"
      >
        {isLoading ? "Signing out..." : "Logout"}
      </motion.button>
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </div>
  );
}
