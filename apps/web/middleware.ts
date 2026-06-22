import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { clientAddress, consumeEdgeLimit, hashAddress, isCrossSiteMutation, isMaliciousBot, limitFor, recordEdgeEvent } from "@/lib/security/edge-protection";

function securityHeaders(response: NextResponse, requestId: string, rate?: { remaining: number; resetAt: number; backend: string }) {
  const headers = response.headers;
  const scriptSrc = process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com"
    : "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com";
  headers.set("X-Request-Id", requestId);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self), usb=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("Content-Security-Policy", `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https: wss:; frame-src https://api.razorpay.com https://checkout.razorpay.com; media-src 'self' blob: https:; worker-src 'self' blob:; upgrade-insecure-requests`);
  if (process.env.NODE_ENV === "production") headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  if (rate) { headers.set("X-RateLimit-Remaining", String(rate.remaining)); headers.set("X-RateLimit-Reset", String(Math.ceil(rate.resetAt / 1000))); headers.set("X-RateLimit-Policy", rate.backend); }
  return response;
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  const requestId = request.headers.get("x-request-id")?.slice(0, 100) ?? crypto.randomUUID();
  const ipHash = await hashAddress(clientAddress(request));
  const limit = limitFor(request.nextUrl.pathname);
  const rate = await consumeEdgeLimit(`${limit.name}:${ipHash}`, limit);
  const log = (eventType: string, severity: string, message: string, metadata?: Record<string, unknown>) => event.waitUntil(recordEdgeEvent({ eventType, severity, request, requestId, ipHash, message, metadata }));

  if (!rate.allowed) { log("rate_limit", "warning", "Request rate limit exceeded.", { bucket: limit.name, backend: rate.backend }); const response = NextResponse.json({ error: "Too many requests. Please retry after the rate-limit window resets.", requestId }, { status: 429 }); response.headers.set("Retry-After", String(Math.max(1, Math.ceil((rate.resetAt - Date.now()) / 1000)))); return securityHeaders(response, requestId, rate); }
  if (isMaliciousBot(request)) { log("bot_blocked", "warning", "Known scanner or malicious path blocked.", { userAgent: request.headers.get("user-agent")?.slice(0, 160) }); return securityHeaders(NextResponse.json({ error: "Request rejected.", requestId }, { status: 403 }), requestId, rate); }
  if (isCrossSiteMutation(request)) { log("api_rejected", "warning", "Cross-site state-changing request blocked.", { origin: request.headers.get("origin") }); return securityHeaders(NextResponse.json({ error: "Cross-site request rejected.", requestId }, { status: 403 }), requestId, rate); }
  const contentLength = Number(request.headers.get("content-length") ?? 0); if (contentLength > 30 * 1024 * 1024) { log("abuse_attempt", "warning", "Oversized request blocked.", { contentLength }); return securityHeaders(NextResponse.json({ error: "Request body exceeds the 30 MB ingress limit.", requestId }, { status: 413 }), requestId, rate); }

  const forwardedHeaders = new Headers(request.headers); forwardedHeaders.set("x-request-id", requestId);
  let response = NextResponse.next({ request: { headers: forwardedHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; const pathname = request.nextUrl.pathname;
  if (!url || !anonKey) { if (pathname.startsWith("/dashboard") || pathname.startsWith("/billing")) { const loginUrl = request.nextUrl.clone(); loginUrl.pathname = "/login"; loginUrl.search = ""; loginUrl.searchParams.set("next", pathname); loginUrl.searchParams.set("error", "configuration"); return securityHeaders(NextResponse.redirect(loginUrl), requestId, rate); } return securityHeaders(response, requestId, rate); }
  const supabase = createServerClient(url, anonKey, { cookies: { getAll: () => request.cookies.getAll(), setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request: { headers: forwardedHeaders } }); cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } } });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/usage-history") || pathname.startsWith("/billing"))) { const loginUrl = request.nextUrl.clone(); loginUrl.pathname = "/login"; loginUrl.search = ""; loginUrl.searchParams.set("next", pathname); return securityHeaders(NextResponse.redirect(loginUrl), requestId, rate); }
  if (user && (pathname === "/login" || pathname === "/signup")) return securityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)), requestId, rate);
  return securityHeaders(response, requestId, rate);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2)$).*)"] };
