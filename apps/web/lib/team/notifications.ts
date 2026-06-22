import { createAdminClient } from "@/lib/supabase/admin";
import { sendExpoPushNotification } from "@/lib/mobile/push";

export const notificationTypes = [
  "project_assigned",
  "project_status_changed",
  "client_approved",
  "client_requested_revision",
  "invoice_created",
  "invoice_paid",
  "message_received",
  "file_uploaded",
  "lead_created",
  "lead_status_changed",
  "lead_converted",
  "subscription_updated",
  "usage_limit_reached",
  "demo_requested",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export type NotificationRow = {
  id: string;
  organization_id: string | null;
  user_id: string | null;
  project_id: string | null;
  title: string | null;
  message: string | null;
  type: NotificationType | string | null;
  is_read: boolean;
  created_at: string;
};

type NotificationInput = {
  organizationId: string;
  projectId?: string | null;
  userId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
};

export function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && notificationTypes.includes(value as NotificationType);
}

export async function createNotification(input: NotificationInput) {
  const adminSupabase = createAdminClient();
  const { data: notification, error } = await adminSupabase
    .from("notifications")
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId ?? null,
      project_id: input.projectId ?? null,
      title: input.title,
      message: input.message,
      type: input.type,
    })
    .select("id,organization_id,user_id,project_id,title,message,type,is_read,created_at")
    .maybeSingle();

  if (error) {
    console.error("[notifications] create failed", { input, error });
  }

  await adminSupabase.from("team_activity_logs").insert({
    organization_id: input.organizationId,
    user_id: input.userId ?? null,
    action: "notification_created",
    metadata: {
      notificationId: notification?.id ?? null,
      projectId: input.projectId ?? null,
      title: input.title,
      type: input.type,
    },
  });

  if (input.userId) {
    await sendExpoPushNotification({ userId: input.userId, title: input.title, body: input.message, data: { notificationId: notification?.id ?? null, organizationId: input.organizationId, projectId: input.projectId ?? null, type: input.type } });
  }

  return notification as NotificationRow | null;
}

export async function createNotificationsForUsers(input: Omit<NotificationInput, "userId"> & { userIds: string[] }) {
  const uniqueUserIds = [...new Set(input.userIds)].filter(Boolean);
  await Promise.all(uniqueUserIds.map((userId) => createNotification({ ...input, userId })));
}

export async function notifyActiveOrganizationMembers(input: Omit<NotificationInput, "userId"> & { excludeUserId?: string | null }) {
  const adminSupabase = createAdminClient();
  const { data: members, error } = await adminSupabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("status", "active");
  if (error) {
    console.error("[notifications] active member lookup failed", { input, error });
    return;
  }
  const userIds = ((members ?? []) as Array<{ user_id: string }>)
    .map((member) => member.user_id)
    .filter((userId) => userId !== input.excludeUserId);
  await createNotificationsForUsers({ ...input, userIds });
}

export async function notifyProjectClient(input: Omit<NotificationInput, "userId">) {
  await createNotification({ ...input, userId: null });
}

export function notificationTypeLabel(type: string | null) {
  if (!type) return "Notification";
  return type.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
