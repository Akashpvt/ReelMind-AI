import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type PushInput = {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export async function sendExpoPushNotification(input: PushInput) {
  try {
    const admin = createAdminClient();
    const { data: tokens } = await admin
      .from("mobile_push_tokens")
      .select("expo_push_token")
      .eq("user_id", input.userId)
      .eq("enabled", true);

    if (!tokens?.length) return;

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        tokens.map((item) => ({
          to: item.expo_push_token,
          sound: "default",
          title: input.title,
          body: input.body,
          data: input.data ?? {},
        })),
      ),
    });

    if (!response.ok) {
      console.error(
        "[mobile-push] Expo rejected push batch",
        await response.text(),
      );
    }
  } catch (error) {
    console.error("[mobile-push] delivery failed", error);
  }
}
