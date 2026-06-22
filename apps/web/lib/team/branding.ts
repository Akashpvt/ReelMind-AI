import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspaceBranding = { agencyName: string; logoUrl: string | null; primaryColor: string; supportEmail: string | null; customFooter: string | null; customDomain: string | null; domainStatus: string; emailNotificationsEnabled: boolean; sessionTimeoutMinutes: number };

export async function getWorkspaceBranding(organizationId: string, fallbackName = "ReelMind AI"): Promise<WorkspaceBranding> {
  const admin = createAdminClient();
  const { data } = await admin.from("organization_settings").select("agency_name,logo_url,primary_color,support_email,custom_footer,custom_domain,domain_status,email_notifications_enabled,session_timeout_minutes").eq("organization_id", organizationId).maybeSingle();
  return { agencyName: data?.agency_name?.trim() || fallbackName, logoUrl: data?.logo_url ?? null, primaryColor: data?.primary_color ?? "#38BDF8", supportEmail: data?.support_email ?? null, customFooter: data?.custom_footer ?? null, customDomain: data?.custom_domain ?? null, domainStatus: data?.domain_status ?? "unverified", emailNotificationsEnabled: data?.email_notifications_enabled ?? true, sessionTimeoutMinutes: data?.session_timeout_minutes ?? 1440 };
}
