import { NextResponse } from "next/server";

import { monitoredCron } from "@/lib/security/monitoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanOverdueInvoices } from "@/lib/whatsapp/service";

export const runtime = "nodejs";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET; if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const results = await monitoredCron("whatsapp-overdue-invoices", async () => { const admin = createAdminClient(); const { data: connections } = await admin.from("whatsapp_connections").select("organization_id").eq("status", "active"); const rows = []; for (const connection of connections ?? []) rows.push({ organizationId: connection.organization_id, sent: await scanOverdueInvoices(connection.organization_id) }); return rows; }); return NextResponse.json({ success: true, results }); } catch { return NextResponse.json({ success: false, error: "WhatsApp invoice cron failed." }, { status: 500 }); }
}
export const POST = GET;
