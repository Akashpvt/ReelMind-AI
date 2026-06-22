import { NextResponse } from "next/server";

import { monitoredCron } from "@/lib/security/monitoring";
import { publishDueSocialPosts, syncSocialMetrics } from "@/lib/social/publishing";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const result = await monitoredCron("social-publishing", async () => { const published = await publishDueSocialPosts(); const admin = createAdminClient(); const { data: organizations } = await admin.from("social_accounts").select("organization_id").eq("status", "connected"); const ids = [...new Set((organizations ?? []).map(item => item.organization_id))]; const metrics = []; for (const id of ids) metrics.push({ organizationId: id, synced: await syncSocialMetrics(id) }); return { published, metrics }; }); return NextResponse.json({ success: true, ...result }); } catch { return NextResponse.json({ success: false, error: "Social publishing cron failed." }, { status: 500 }); }
}
export const POST = GET;
