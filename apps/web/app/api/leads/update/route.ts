import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageLeads, isLeadStatus, leadStatusLabel } from "@/lib/team/lead-types";
import { leadSelect } from "@/lib/team/leads";
import { notifyActiveOrganizationMembers } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  const status = typeof body.status === "string" ? body.status : "";
  const assignedTo = typeof body.assignedTo === "string" ? body.assignedTo : "";
  if (!leadId) return NextResponse.json({ error: "leadId is required." }, { status: 400 });
  if (!assignedTo && !isLeadStatus(status)) return NextResponse.json({ error: "A valid status or assignee is required." }, { status: 400 });

  const adminSupabase = createAdminClient();
  const { data: existingLead, error: leadError } = await adminSupabase
    .from("leads")
    .select(leadSelect)
    .eq("id", leadId)
    .single();

  if (leadError || !existingLead) {
    return NextResponse.json({ error: leadError?.message ?? "Lead not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, existingLead.organization_id);
  if (!activeTeam || !canManageLeads(activeTeam.membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, managers, and editors can update leads." }, { status: 403 });
  }

  const previousStatus = String(existingLead.status);
  if (assignedTo) {
    const { data: member } = await adminSupabase.from("organization_members").select("user_id").eq("organization_id", existingLead.organization_id).eq("user_id", assignedTo).eq("status", "active").maybeSingle();
    if (!member) return NextResponse.json({ error: "Assignee must be an active workspace member." }, { status: 400 });
  }
  const updates = { ...(isLeadStatus(status) ? { status } : {}), ...(assignedTo ? { assigned_to: assignedTo } : {}), updated_at: new Date().toISOString() };
  const { data: lead, error } = await adminSupabase
    .from("leads")
    .update(updates)
    .eq("id", leadId)
    .select(leadSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminSupabase.from("lead_activity_logs").insert({
    organization_id: existingLead.organization_id,
    lead_id: leadId,
    user_id: user.id,
    action: assignedTo && assignedTo !== existingLead.assigned_to ? "lead_assigned" : previousStatus === status ? "lead_updated" : "lead_status_changed",
    metadata: { leadName: existingLead.name, previousStatus, newStatus: status || previousStatus, assignedTo: assignedTo || null },
  });

  if (isLeadStatus(status) && previousStatus !== status) {
    await notifyActiveOrganizationMembers({
      organizationId: existingLead.organization_id,
      type: "lead_status_changed",
      title: "Lead status changed",
      message: `${existingLead.name} moved from ${leadStatusLabel(previousStatus)} to ${leadStatusLabel(status)}.`,
      excludeUserId: user.id,
    });
  }
  if (assignedTo && assignedTo !== existingLead.assigned_to) await notifyWhatsAppEvent(existingLead.organization_id,"lead_assigned",{phone:existingLead.phone,leadId,name:existingLead.name});

  return NextResponse.json({ success: true, lead });
}
