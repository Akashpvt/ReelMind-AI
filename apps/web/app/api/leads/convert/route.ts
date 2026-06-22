import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { assertWithinPlanLimit } from "@/lib/billing/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { canManageLeads } from "@/lib/team/lead-types";
import { leadSelect } from "@/lib/team/leads";
import { notifyActiveOrganizationMembers } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

const projectSelect = "id,organization_id,client_name,client_email,client_phone,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  if (!leadId) return NextResponse.json({ error: "leadId is required." }, { status: 400 });

  const adminSupabase = createAdminClient();
  const { data: lead, error: leadError } = await adminSupabase
    .from("leads")
    .select(leadSelect)
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: leadError?.message ?? "Lead not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, lead.organization_id);
  if (!activeTeam || !canManageLeads(activeTeam.membership.role)) {
    return NextResponse.json({ error: "Only owners, admins, managers, and editors can convert leads." }, { status: 403 });
  }

  if (lead.converted_project_id) {
    return NextResponse.json({ error: "Lead is already converted." }, { status: 400 });
  }

  const limitCheck = await assertWithinPlanLimit(lead.organization_id, "projects");
  if (!limitCheck.ok) {
    return NextResponse.json({ error: limitCheck.error, upgradeRequired: true }, { status: 402 });
  }

  const { data: project, error: projectError } = await adminSupabase
    .from("client_projects")
    .insert({
      organization_id: lead.organization_id,
      client_name: lead.name,
      client_email: lead.email,
      client_phone: lead.phone,
      project_title: `${lead.name} Project`,
      project_description: lead.notes,
      budget: Number(lead.budget ?? 0),
      status: "brief",
      priority: "medium",
      created_by: user.id,
    })
    .select(projectSelect)
    .single();

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 400 });

  const { data: updatedLead } = await adminSupabase
    .from("leads")
    .update({ status: "won", converted_project_id: project.id, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .select(leadSelect)
    .single();

  await adminSupabase.from("lead_activity_logs").insert({
    organization_id: lead.organization_id,
    lead_id: leadId,
    user_id: user.id,
    action: "lead_converted",
    metadata: { leadName: lead.name, projectId: project.id, projectTitle: project.project_title },
  });

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: lead.organization_id,
    project_id: project.id,
    user_id: user.id,
    action: "project_created_from_lead",
    metadata: { leadId, leadName: lead.name },
  });

  await notifyActiveOrganizationMembers({
    organizationId: lead.organization_id,
    projectId: project.id,
    type: "lead_converted",
    title: "Lead converted",
    message: `${lead.name} was converted into ${project.project_title}.`,
    excludeUserId: user.id,
  });

  await dispatchWorkflowTrigger(lead.organization_id, "lead_converted", { userId: user.id, leadId, leadName: lead.name, projectId: project.id, projectTitle: project.project_title, clientEmail: lead.email ?? undefined });
  return NextResponse.json({ success: true, lead: updatedLead, project });
}
