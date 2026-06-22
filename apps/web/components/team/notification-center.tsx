"use client";

import { useEffect, useMemo, useState } from "react";
import type { NotificationRow } from "@/lib/team/notifications";

type NotificationPayload = {
  notifications?: NotificationRow[];
  unreadCount?: number;
  error?: string;
};

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function notificationTypeLabel(type: string | null) {
  if (!type) return "Notification";
  return type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [error, setError] = useState("");
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.is_read).length, [notifications]);

  async function loadNotifications() {
    const response = await fetch("/api/notifications/list", { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as NotificationPayload;
    if (!response.ok) {
      setError(payload.error ?? "Unable to load notifications.");
      return;
    }
    setNotifications(payload.notifications ?? []);
    setError("");
  }

  async function markRead(notificationId: string) {
    setNotifications((items) => items.map((item) => item.id === notificationId ? { ...item, is_read: true } : item));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationId }),
    });
  }

  async function markAllRead() {
    setNotifications((items) => items.map((item) => ({ ...item, is_read: true })));
    await fetch("/api/notifications/read-all", { method: "POST" });
  }

  useEffect(() => {
    void loadNotifications();
  }, []);

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-frost transition hover:border-cyberBlue/50 hover:text-cyberBlue" aria-label="Notifications">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount ? (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-cyberBlue px-1.5 py-0.5 text-center text-[10px] font-bold text-ink">{unreadCount}</span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-ink/95 p-3 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyberBlue">Notifications</p>
            <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-mist transition hover:text-frost">Mark all read</button>
          </div>
          {error ? <p className="mt-3 rounded-xl border border-[#FDA4AF]/30 p-3 text-xs text-[#FDA4AF]">{error}</p> : null}
          <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
            {notifications.length ? notifications.map((notification) => (
              <button key={notification.id} type="button" onClick={() => void markRead(notification.id)} className={`w-full rounded-xl border p-3 text-left transition ${notification.is_read ? "border-white/10 bg-white/[0.03]" : "border-cyberBlue/40 bg-cyberBlue/[0.08]"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-frost">{notification.title ?? notificationTypeLabel(notification.type)}</p>
                  {!notification.is_read ? <span className="mt-1 h-2 w-2 rounded-full bg-cyberBlue" /> : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-mist">{notification.message ?? "New update available."}</p>
                <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-cyberBlue">{notificationTypeLabel(notification.type)} / {formatTime(notification.created_at)}</p>
              </button>
            )) : (
              <p className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-mist">No notifications yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
