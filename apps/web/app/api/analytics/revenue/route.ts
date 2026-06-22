import { NextResponse } from "next/server";
import { buildMonthlyRevenue, loadAnalyticsRows, resolveAnalyticsAccess } from "@/lib/team/analytics";

export const runtime = "nodejs";

export async function GET() {
  const access = await resolveAnalyticsAccess();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { invoices } = await loadAnalyticsRows(access.organizationId);
  return NextResponse.json(buildMonthlyRevenue(invoices));
}
