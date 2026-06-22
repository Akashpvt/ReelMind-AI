import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";
import { assertWithinPlanLimit } from "@/lib/billing/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageLeads } from "@/lib/team/lead-types";
import { leadSelect } from "@/lib/team/leads";
import { notifyActiveOrganizationMembers } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" && body.email.trim() ? body.email.trim() : null;
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;
  const source = typeof body.source === "string" && body.source.trim() ? body.source.trim() : null;
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;
  const budget = typeof body.budget === "number" ? body.budget : Number(body.budget ?? 0);

  if (!organizationId) return NextResponse.json({ error: "organizationId is required." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Lead name is required." }, { status: 400 });

  const activeTeam = await resolveActiveTeam(user.id, organizationId);
  if (!activeTeam || !canManageLeads(activeTeam.membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, managers, and editors can create leads." }, { status: 403 });
  }

  const limitCheck = await assertWithinPlanLimit(organizationId, "leads");
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.error, upgradeRequired: true }, { status: 402 });
  }

  const adminSupabase = createAdminClient();
  const { data: lead, error } = await adminSupabase
    .from("leads")
    .insert({
      organization_id: organizationId,
      name,
      email,
      phone,
      source,
      budget: Number.isFinite(budget) ? budget : 0,
      notes,
      status: "new",
      created_by: user.id,
    })
    .select(leadSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminSupabase.from("lead_activity_logs").insert({
    organization_id: organizationId,
    lead_id: lead.id,
    user_id: user.id,
    action: "lead_created",
    metadata: { name, source, budget },
  });

  await notifyActiveOrganizationMembers({
    organizationId,
    type: "lead_created",
    title: "New lead created",
    message: `${name} entered the CRM pipeline.`,
    excludeUserId: user.id,
  });

  await dispatchWorkflowTrigger(organizationId, "lead_created", { userId: user.id, leadId: lead.id, leadName: name, clientEmail: email ?? undefined, source: source ?? undefined, budget });
  await notifyWhatsAppEvent(organizationId,"lead_created",{phone,name,leadId:lead.id,budget});
  return NextResponse.json({ success: true, lead });
}
