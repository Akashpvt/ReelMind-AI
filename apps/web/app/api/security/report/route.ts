import { NextResponse } from "next/server";

import { monitorError } from "@/lib/security/monitoring";

export async function POST(request: Request) { const body = await request.json().catch(() => ({})) as Record<string, unknown>; const message = typeof body.message === "string" ? body.message.slice(0, 1000) : "Client application error"; const digest = typeof body.digest === "string" ? body.digest.slice(0, 200) : undefined; await monitorError(new Error(message), { source: "client", route: typeof body.route === "string" ? body.route.slice(0, 500) : undefined, requestId: request.headers.get("x-request-id") ?? undefined, fingerprint: digest, metadata: { digest, stack: typeof body.stack === "string" ? body.stack.slice(0, 5000) : undefined } }); return NextResponse.json({ received: true }, { status: 202 }); }
