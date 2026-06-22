import type { NotificationRow } from "@/lib/team/notifications";

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

export function ClientNotifications({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Notifications</p>
      <div className="mt-4 space-y-3">
        {notifications.length ? notifications.map((notification) => (
          <article key={notification.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
            <p className="text-sm font-semibold text-frost">{notification.title ?? notificationTypeLabel(notification.type)}</p>
            <p className="mt-2 text-sm leading-6 text-mist">{notification.message ?? "Project update available."}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.14em] text-cyberBlue">{notificationTypeLabel(notification.type)} / {formatTime(notification.created_at)}</p>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No client notifications yet.</p>
        )}
      </div>
    </section>
  );
}
