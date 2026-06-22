import { NextResponse } from "next/server";

import { generateContent } from "@/lib/content-ai/engine";
import { contentGenerationTypes, type ContentGenerationInput } from "@/lib/content-ai/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionError, resolvePermission } from "@/lib/team/permission-guards";

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await resolvePermission("content:edit", organizationId);
  if (!access.ok) return permissionError(access);
  const admin = createAdminClient();
  const [generations, calendars, reports, settings] = await Promise.all([
    admin.from("ai_generations").select("id,generation_type,provider,model,input,output,status,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(40),
    admin.from("content_calendars").select("id,title,client_name,start_date,end_date,platforms,entries,status,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(20),
    admin.from("strategy_reports").select("id,report_type,title,client_name,executive_summary,content,status,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(20),
    admin.from("organization_settings").select("agency_name,primary_color").eq("organization_id", access.organizationId).maybeSingle(),
  ]);
  const error = generations.error ?? calendars.error ?? reports.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ generations: generations.data ?? [], calendars: calendars.data ?? [], reports: reports.data ?? [], brand: settings.data ?? null });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : null;
  const access = await resolvePermission("content:edit", organizationId);
  if (!access.ok) return permissionError(access);
  const operation = typeof body.operation === "string" ? body.operation : "generate";
  const admin = createAdminClient();

  if (operation === "export") {
    const format = body.format === "docx" ? "docx" : "pdf";
    const generationId = typeof body.generationId === "string" ? body.generationId : null;
    await admin.from("team_activity_logs").insert({ organization_id: access.organizationId, user_id: access.user.id, action: "ai_content_exported", metadata: { format, generationId } });
    return NextResponse.json({ success: true });
  }

  const type = typeof body.type === "string" && contentGenerationTypes.includes(body.type as ContentGenerationInput["type"]) ? body.type as ContentGenerationInput["type"] : null;
  if (!type) return NextResponse.json({ error: "Choose a valid content tool." }, { status: 400 });
  const input: ContentGenerationInput = {
    type,
    provider: body.provider === "openai" || body.provider === "gemini" || body.provider === "claude" ? body.provider : "auto",
    topic: String(body.topic ?? "").trim().slice(0, 500),
    brand: String(body.brand ?? "").trim().slice(0, 200),
    audience: String(body.audience ?? "").trim().slice(0, 500),
    tone: String(body.tone ?? "Confident, premium, clear").trim().slice(0, 200),
    platform: String(body.platform ?? "Instagram").trim().slice(0, 100),
    objective: String(body.objective ?? "Build trust and generate qualified demand").trim().slice(0, 500),
    clientName: String(body.clientName ?? "").trim().slice(0, 200),
    startDate: typeof body.startDate === "string" ? body.startDate : undefined,
    days: typeof body.days === "number" ? body.days : Number(body.days) || 14,
  };
  if (!input.topic) return NextResponse.json({ error: "Add a topic or campaign brief." }, { status: 400 });

  let generated;
  try { generated = await generateContent(input, { organizationId: access.organizationId, userId: access.user.id }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "All AI providers failed." }, { status: 503 }); }
  const { data: generation, error } = await admin.from("ai_generations").insert({ organization_id: access.organizationId, created_by: access.user.id, generation_type: type, provider: generated.provider, model: generated.model, prompt: generated.prompt, input, output: generated.output, status: "completed" }).select("id,generation_type,provider,model,input,output,status,created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (type === "content_calendar" && generated.output.calendar?.length) {
    const entries = generated.output.calendar;
    await admin.from("content_calendars").insert({ organization_id: access.organizationId, generation_id: generation.id, created_by: access.user.id, title: generated.output.title, client_name: input.clientName || null, start_date: entries[0].date, end_date: entries[entries.length - 1].date, platforms: [input.platform], entries });
  }
  if (type === "brand_analysis" || type === "strategy_report") {
    await admin.from("strategy_reports").insert({ organization_id: access.organizationId, generation_id: generation.id, created_by: access.user.id, report_type: type === "brand_analysis" ? "brand_analysis" : "client_strategy", title: generated.output.title, client_name: input.clientName || input.brand || null, executive_summary: generated.output.summary, content: generated.output });
  }
  await admin.from("team_activity_logs").insert({ organization_id: access.organizationId, user_id: access.user.id, action: "ai_content_generated", metadata: { generationId: generation.id, type, provider: generated.provider, fallbackCount: generated.fallbackCount } });
  return NextResponse.json({ generation });
}
