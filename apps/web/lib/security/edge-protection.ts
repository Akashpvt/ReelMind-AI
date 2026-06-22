import type { NextRequest } from "next/server";

type Limit = { limit: number; windowSeconds: number; name: string };
type Entry = { count: number; resetAt: number };
const memory = new Map<string, Entry>();

export function limitFor(pathname: string): Limit {
  if (pathname === "/api/health") return { limit: 60, windowSeconds: 60, name: "health" };
  if (pathname.startsWith("/api/demo")) return { limit: 5, windowSeconds: 3600, name: "public-lead" };
  if (pathname.includes("generate") || pathname.includes("content-ai") || pathname.includes("ai-agency")) return { limit: 20, windowSeconds: 60, name: "ai" };
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/auth")) return { limit: 15, windowSeconds: 600, name: "auth" };
  return { limit: pathname.startsWith("/api/") ? 120 : 300, windowSeconds: 60, name: pathname.startsWith("/api/") ? "api" : "web" };
}

export function clientAddress(request: NextRequest) { return request.headers.get("cf-connecting-ip") ?? request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"; }
export async function hashAddress(value: string) { const salt = process.env.SECURITY_HASH_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 24) ?? "reelmind-security"; const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${value}`)); return Array.from(new Uint8Array(digest)).slice(0, 16).map(byte => byte.toString(16).padStart(2, "0")).join(""); }

async function upstash(key: string, limit: Limit) {
  const url = process.env.UPSTASH_REDIS_REST_URL; const token = process.env.UPSTASH_REDIS_REST_TOKEN; if (!url || !token) return null;
  try { const response = await fetch(`${url}/pipeline`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify([["INCR", key], ["EXPIRE", key, limit.windowSeconds, "NX"]]) }); if (!response.ok) return null; const result = await response.json() as Array<{ result?: number }>; const count = Number(result[0]?.result ?? 1); return { allowed: count <= limit.limit, remaining: Math.max(limit.limit - count, 0), resetAt: Date.now() + limit.windowSeconds * 1000, backend: "upstash" as const }; } catch { return null; }
}

export async function consumeEdgeLimit(key: string, limit: Limit) {
  const distributed = await upstash(`reelmind:rate:${limit.name}:${key}`, limit); if (distributed) return distributed;
  const now = Date.now(); const existing = memory.get(key); const entry = !existing || existing.resetAt <= now ? { count: 1, resetAt: now + limit.windowSeconds * 1000 } : { count: existing.count + 1, resetAt: existing.resetAt }; memory.set(key, entry);
  if (memory.size > 10000) for (const [candidate, value] of memory) if (value.resetAt <= now) memory.delete(candidate);
  return { allowed: entry.count <= limit.limit, remaining: Math.max(limit.limit - entry.count, 0), resetAt: entry.resetAt, backend: "memory" as const };
}

export function isMaliciousBot(request: NextRequest) { const agent = request.headers.get("user-agent")?.toLowerCase() ?? ""; const path = request.nextUrl.pathname.toLowerCase(); return /(sqlmap|nikto|nmap|masscan|acunetix|nessus|dirbuster|gobuster|wpscan)/.test(agent) || /(\.env|\.git\/|wp-admin|wp-login|phpmyadmin|\/etc\/passwd)/.test(path); }
export function isCrossSiteMutation(request: NextRequest) { if (!["POST","PUT","PATCH","DELETE"].includes(request.method)) return false; const exempt = ["/api/whatsapp/webhook","/api/social/cron","/api/whatsapp/cron","/api/health","/api/security/report"]; if (exempt.some(path => request.nextUrl.pathname.startsWith(path))) return false; return request.headers.get("sec-fetch-site") === "cross-site"; }

export async function recordEdgeEvent(event: { eventType: string; severity: string; request: NextRequest; requestId: string; ipHash: string; message: string; metadata?: Record<string, unknown> }) { const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY; if (!url || !key) return; try { await fetch(`${url}/rest/v1/security_events`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ event_type: event.eventType, severity: event.severity, source: "middleware", route: event.request.nextUrl.pathname, method: event.request.method, request_id: event.requestId, ip_hash: event.ipHash, message: event.message, metadata: event.metadata ?? {} }) }); } catch { /* Security logging must never break request handling. */ } }
