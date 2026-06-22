import { NextResponse } from "next/server";

import { resolvePlatformAdmin } from "@/lib/enterprise/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const access = await resolvePlatformAdmin(); if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
  const admin = createAdminClient(); const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const [events, workflows, agents, social, crons] = await Promise.all([
    admin.from("security_events").select("id,event_type,severity,source,route,method,request_id,message,metadata,resolved_at,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(500),
    admin.from("workflow_runs").select("id,status,started_at,completed_at,error_message").in("status", ["running","failed"]).order("started_at", { ascending: false }).limit(100),
    admin.from("agent_tasks").select("id,status,created_at,updated_at").in("status", ["queued","processing","failed"]).order("created_at", { ascending: false }).limit(100),
    admin.from("social_schedules").select("id,status,scheduled_for,last_attempt_at,error_message").in("status", ["scheduled","processing","failed"]).order("scheduled_for", { ascending: true }).limit(100),
    admin.from("cron_monitors").select("id,name,expected_interval_minutes,status,last_started_at,last_completed_at,last_duration_ms,last_error,consecutive_failures,updated_at").order("name"),
  ]);
  const firstError = [events, workflows, agents, social, crons].find(result => result.error)?.error; if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });
  const workflowRows = workflows.data ?? []; const agentRows = agents.data ?? []; const socialRows = social.data ?? [];
  const queues = [
    { name: "workflows", pending: 0, processing: workflowRows.filter(row => row.status === "running").length, failed: workflowRows.filter(row => row.status === "failed").length, oldest: workflowRows.filter(row => row.status === "running").map(row => row.started_at).sort()[0] ?? null },
    { name: "ai-agents", pending: agentRows.filter(row => row.status === "queued").length, processing: agentRows.filter(row => row.status === "processing").length, failed: agentRows.filter(row => row.status === "failed").length, oldest: agentRows.filter(row => row.status === "queued").map(row => row.created_at).sort()[0] ?? null },
    { name: "social-publishing", pending: socialRows.filter(row => row.status === "scheduled").length, processing: socialRows.filter(row => row.status === "processing").length, failed: socialRows.filter(row => row.status === "failed").length, oldest: socialRows.filter(row => row.status === "scheduled").map(row => row.scheduled_for).sort()[0] ?? null },
  ];
  await admin.from("queue_snapshots").insert(queues.map(queue => ({ queue_name: queue.name, pending_count: queue.pending, processing_count: queue.processing, failed_count: queue.failed, oldest_pending_at: queue.oldest })));
  const eventRows = events.data ?? []; const last24h = Date.now() - 86400000; const recent = eventRows.filter(row => new Date(row.created_at).getTime() >= last24h);
  const cronRows = (crons.data ?? []).map(row => { const completed = row.last_completed_at ? new Date(row.last_completed_at).getTime() : 0; const stale = !completed || Date.now() - completed > row.expected_interval_minutes * 2 * 60000; return { ...row, effectiveStatus: stale && row.status !== "running" ? "stale" : row.status }; });
  return NextResponse.json({ role: access.role, metrics: { errors: recent.filter(row => row.event_type === "error").length, failedJobs: queues.reduce((sum, queue) => sum + queue.failed, 0), rateLimits: recent.filter(row => row.event_type === "rate_limit").length, abuseAttempts: recent.filter(row => ["abuse_attempt","bot_blocked","api_rejected"].includes(row.event_type)).length }, events: eventRows, queues, crons: cronRows, integrations: { sentry: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN), distributedRateLimit: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN), healthToken: Boolean(process.env.HEALTH_CHECK_TOKEN), cronSecret: Boolean(process.env.CRON_SECRET), backups: "runbook_ready" } });
}
