import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type SecurityEvent = { eventType: "error" | "failed_job" | "rate_limit" | "abuse_attempt" | "bot_blocked" | "api_rejected" | "health_degraded" | "cron_failed"; severity?: "info" | "warning" | "error" | "critical"; source?: string; route?: string; method?: string; requestId?: string; userId?: string; organizationId?: string; fingerprint?: string; message: string; metadata?: Record<string, unknown> };

export async function recordSecurityEvent(input: SecurityEvent) {
  try { await createAdminClient().from("security_events").insert({ event_type: input.eventType, severity: input.severity ?? "error", source: input.source ?? "application", route: input.route ?? null, method: input.method ?? null, request_id: input.requestId ?? null, user_id: input.userId ?? null, organization_id: input.organizationId ?? null, fingerprint: input.fingerprint ?? null, message: input.message.slice(0, 2000), metadata: input.metadata ?? {} }); } catch (error) { console.error("[security-monitoring] event persistence failed", error); }
}

function sentryEndpoint(dsn: string) { try { const parsed = new URL(dsn); const parts = parsed.pathname.split("/").filter(Boolean); const projectId = parts.pop(); if (!projectId) return null; const basePath = parts.length ? `/${parts.join("/")}` : ""; return { url: `${parsed.protocol}//${parsed.host}${basePath}/api/${projectId}/envelope/?sentry_key=${parsed.username}&sentry_version=7`, projectId }; } catch { return null; } }

export async function captureSentry(error: unknown, context: { source?: string; route?: string; requestId?: string; tags?: Record<string, string>; extra?: Record<string, unknown> } = {}) {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN; if (!dsn) return false; const endpoint = sentryEndpoint(dsn); if (!endpoint) return false;
  const eventId = crypto.randomUUID().replaceAll("-", ""); const exception = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown application error");
  const payload = { event_id: eventId, timestamp: new Date().toISOString(), platform: "javascript", level: "error", environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV, release: process.env.SENTRY_RELEASE ?? process.env.VERCEL_GIT_COMMIT_SHA, server_name: process.env.VERCEL_REGION, tags: { source: context.source ?? "application", ...context.tags }, request: { url: context.route }, exception: { values: [{ type: exception.name, value: exception.message, stacktrace: { frames: (exception.stack ?? "").split("\n").slice(0, 30).map(line => ({ filename: line.trim() })) } }] }, extra: { requestId: context.requestId, ...context.extra } };
  const envelope = `${JSON.stringify({ event_id: eventId, dsn })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(payload)}`;
  try { const response = await fetch(endpoint.url, { method: "POST", headers: { "Content-Type": "application/x-sentry-envelope" }, body: envelope }); return response.ok; } catch { return false; }
}

export async function monitorError(error: unknown, input: Omit<SecurityEvent, "eventType" | "message"> & { message?: string }) { const message = input.message ?? (error instanceof Error ? error.message : "Unknown application error"); await Promise.all([recordSecurityEvent({ ...input, eventType: "error", message }), captureSentry(error, { source: input.source, route: input.route, requestId: input.requestId, extra: input.metadata })]); }

export async function monitoredCron<T>(name: string, task: () => Promise<T>) {
  const admin = createAdminClient(); const started = Date.now(); await admin.from("cron_monitors").upsert({ name, expected_interval_minutes: name === "social-publishing" ? 5 : 60, status: "running", last_started_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "name" });
  try { const result = await task(); await admin.from("cron_monitors").update({ status: "healthy", last_completed_at: new Date().toISOString(), last_duration_ms: Date.now() - started, last_error: null, consecutive_failures: 0, updated_at: new Date().toISOString() }).eq("name", name); return result; } catch (error) { const { data } = await admin.from("cron_monitors").select("consecutive_failures").eq("name", name).maybeSingle(); await admin.from("cron_monitors").update({ status: "failed", last_completed_at: new Date().toISOString(), last_duration_ms: Date.now() - started, last_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown cron failure", consecutive_failures: Number(data?.consecutive_failures ?? 0) + 1, updated_at: new Date().toISOString() }).eq("name", name); await Promise.all([recordSecurityEvent({ eventType: "cron_failed", severity: "error", source: "cron", message: `${name} cron failed`, metadata: { error: error instanceof Error ? error.message : String(error) } }), captureSentry(error, { source: "cron", tags: { cron: name } })]); throw error; }
}
