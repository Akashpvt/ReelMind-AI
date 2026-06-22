import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { permissionError, resolvePermission } from "@/lib/team/permission-guards";
import { workflowTemplates } from "@/lib/workflows/templates";
import { isWorkflowAction, isWorkflowTrigger, type WorkflowAction } from "@/lib/workflows/types";

const text = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : "";
function validActions(value: unknown): value is WorkflowAction[] { return Array.isArray(value) && value.length > 0 && value.length <= 10 && value.every((item) => item && typeof item === "object" && isWorkflowAction((item as WorkflowAction).type) && typeof (item as WorkflowAction).config === "object"); }

export async function GET(request: Request) {
  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const access = await resolvePermission("projects:manage", organizationId);
  if (!access.ok) return permissionError(access);
  const admin = createAdminClient();
  const [workflows, runs, logs, members] = await Promise.all([
    admin.from("workflows").select("id,name,description,trigger_type,trigger_config,actions,status,is_template,template_key,created_at,updated_at").eq("organization_id", access.organizationId).neq("status", "archived").order("created_at", { ascending: false }),
    admin.from("workflow_runs").select("id,workflow_id,trigger_type,status,started_at,completed_at,error_message").eq("organization_id", access.organizationId).order("started_at", { ascending: false }).limit(50),
    admin.from("workflow_logs").select("id,workflow_run_id,action_type,action_index,status,error_message,created_at").eq("organization_id", access.organizationId).order("created_at", { ascending: false }).limit(100),
    admin.from("organization_members").select("id,user_id,role").eq("organization_id", access.organizationId).eq("status", "active"),
  ]);
  return NextResponse.json({ workflows: workflows.data ?? [], runs: runs.data ?? [], logs: logs.data ?? [], members: members.data ?? [], templates: workflowTemplates });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const organizationId = text(body.organizationId, 64);
  const access = await resolvePermission("projects:manage", organizationId);
  if (!access.ok) return permissionError(access);
  const operation = text(body.operation, 30) || "save";
  const admin = createAdminClient();

  if (operation === "status") {
    const id = text(body.id, 64); const status = text(body.status, 20);
    if (!id || !["active", "paused", "archived"].includes(status)) return NextResponse.json({ error: "Invalid workflow status." }, { status: 400 });
    const { error } = await admin.from("workflows").update({ status, updated_at: new Date().toISOString() }).eq("id", id).eq("organization_id", organizationId); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("team_activity_logs").insert({ organization_id: organizationId, user_id: access.user.id, action: "workflow_status_changed", metadata: { workflowId: id, status } });
    return NextResponse.json({ success: true });
  }

  if (operation === "template") {
    const template = workflowTemplates.find((item) => item.key === body.templateKey);
    if (!template) return NextResponse.json({ error: "Workflow template not found." }, { status: 404 });
    const { data, error } = await admin.from("workflows").insert({ organization_id: organizationId, name: template.name, description: template.description, trigger_type: template.trigger, actions: template.actions, status: "paused", is_template: true, template_key: template.key, created_by: access.user.id }).select("id").single(); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin.from("team_activity_logs").insert({ organization_id: organizationId, user_id: access.user.id, action: "workflow_created", metadata: { workflowId: data.id, templateKey: template.key } });
    return NextResponse.json({ success: true, id: data.id });
  }

  const id = text(body.id, 64); const name = text(body.name); const description = text(body.description, 500); const trigger = body.triggerType; const actions = body.actions;
  if (!name || !isWorkflowTrigger(trigger) || !validActions(actions)) return NextResponse.json({ error: "Name, trigger, and at least one valid action are required." }, { status: 400 });
  const values = { organization_id: organizationId, name, description: description || null, trigger_type: trigger, trigger_config: body.triggerConfig && typeof body.triggerConfig === "object" ? body.triggerConfig : {}, actions, updated_at: new Date().toISOString() };
  const query = id ? admin.from("workflows").update(values).eq("id", id).eq("organization_id", organizationId) : admin.from("workflows").insert({ ...values, status: "paused", created_by: access.user.id });
  const { data, error } = await query.select("id").single(); if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await admin.from("team_activity_logs").insert({ organization_id: organizationId, user_id: access.user.id, action: id ? "workflow_updated" : "workflow_created", metadata: { workflowId: data.id, trigger, actionTypes: actions.map((action) => action.type) } });
  return NextResponse.json({ success: true, id: data.id });
}
