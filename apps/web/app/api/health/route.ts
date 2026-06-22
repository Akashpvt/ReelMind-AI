import { NextResponse } from "next/server";

import { recordSecurityEvent } from "@/lib/security/monitoring";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const started = Date.now(); const checks: Record<string, { status: "up" | "degraded"; latencyMs?: number }> = {};
  try { const dbStarted = Date.now(); const admin = createAdminClient(); const { error } = await admin.from("organizations").select("id", { count: "exact", head: true }); if (error) throw error; checks.database = { status: "up", latencyMs: Date.now() - dbStarted }; const { data: failedCrons, error: cronError } = await admin.from("cron_monitors").select("name,status,last_completed_at,expected_interval_minutes").eq("status", "failed"); if (cronError) throw cronError; checks.crons = { status: failedCrons?.length ? "degraded" : "up" }; } catch (error) { checks.database = { status: "degraded" }; await recordSecurityEvent({ eventType: "health_degraded", severity: "critical", source: "health", route: "/api/health", message: error instanceof Error ? error.message : "Database health check failed" }); }
  const status = Object.values(checks).some(check => check.status === "degraded") ? "degraded" : "healthy"; const authorized = Boolean(process.env.HEALTH_CHECK_TOKEN && request.headers.get("authorization") === `Bearer ${process.env.HEALTH_CHECK_TOKEN}`);
  return NextResponse.json({ status, timestamp: new Date().toISOString(), uptimeSeconds: Math.round(process.uptime()), latencyMs: Date.now() - started, version: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "development", ...(authorized ? { checks, region: process.env.VERCEL_REGION ?? "local", runtime: process.version } : {}) }, { status: status === "healthy" ? 200 : 503, headers: { "Cache-Control": "no-store, max-age=0" } });
}
