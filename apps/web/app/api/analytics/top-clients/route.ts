import { NextResponse } from "next/server";
import { buildTopClients, loadAnalyticsRows, resolveAnalyticsAccess } from "@/lib/team/analytics";

export const runtime = "nodejs";

export async function GET() {
  const access = await resolveAnalyticsAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { projects, invoices } = await loadAnalyticsRows(access.organizationId);
  return NextResponse.json(buildTopClients(projects, invoices));
}
