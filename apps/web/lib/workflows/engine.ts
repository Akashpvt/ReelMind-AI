import "server-only";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceBranding } from "@/lib/team/branding";
import type { WorkflowAction, WorkflowTrigger, TriggerPayload } from "@/lib/workflows/types";

type WorkflowRow = { id: string; organization_id: string; name: string; trigger_type: WorkflowTrigger; trigger_config: Record<string, unknown>; actions: WorkflowAction[] };
const notificationType: Record<WorkflowTrigger, string> = { project_created: "project_status_changed", project_assigned: "project_assigned", status_changed: "project_status_changed", client_approved: "client_approved", invoice_paid: "invoice_paid", lead_created: "lead_created", lead_converted: "lead_converted", file_uploaded: "file_uploaded" };
const value = (input: unknown) => typeof input === "string" ? input : "";

function interpolate(template: unknown, payload: TriggerPayload) {
  return value(template).replace(/\{\{(\w+)\}\}/g, (_match, key: string) => String(payload[key] ?? ""));
}

function matchesConfig(config: Record<string, unknown>, payload: TriggerPayload) {
  return Object.entries(config).every(([key, expected]) => expected === "" || expected === undefined || String(payload[key] ?? "") === String(expected));
}

async function resolveRecipient(organizationId: string, recipient: unknown, payload: TriggerPayload) {
  const admin = createAdminClient();
  if (recipient === "assignee") return { userId: value(payload.assignedUserId) || value(payload.userId), email: value(payload.assignedEmail) };
  if (recipient === "client") return { userId: "", email: value(payload.clientEmail) };
  if (recipient === "owner") {
    const { data: organization } = await admin.from("organizations").select("owner_id").eq("id", organizationId).single();
    const ownerId = organization?.owner_id ?? "";
    const { data } = ownerId ? await admin.auth.admin.getUserById(ownerId) : { data: null };
    return { userId: ownerId, email: data?.user?.email ?? "" };
  }
  const configuredUserId = value(recipient);
  if (configuredUserId) {
    const { data } = await admin.auth.admin.getUserById(configuredUserId);
    return { userId: configuredUserId, email: data?.user?.email ?? "" };
  }
  return { userId: "", email: "" };
}

async function executeAction(workflow: WorkflowRow, runId: string, action: WorkflowAction, payload: TriggerPayload) {
  const admin = createAdminClient();
  const config = action.config ?? {};
  if (action.type === "create_notification") {
    const recipient = await resolveRecipient(workflow.organization_id, config.recipient, payload);
    const { data, error } = await admin.from("notifications").insert({ organization_id: workflow.organization_id, user_id: recipient.userId || null, project_id: payload.projectId ?? null, title: interpolate(config.title, payload) || workflow.name, message: interpolate(config.message, payload) || `Workflow ${workflow.name} completed.`, type: notificationType[workflow.trigger_type] }).select("id").single();
    if (error) throw error; return { notificationId: data.id };
  }
  if (action.type === "send_email") {
    const recipient = await resolveRecipient(workflow.organization_id, config.recipient, payload);
    const to = value(config.to) || recipient.email;
    const resend = getResendClient();
    if (!resend) throw new Error("RESEND_API_KEY is not configured.");
    if (!to) throw new Error("Workflow email recipient is missing.");
    const branding = await getWorkspaceBranding(workflow.organization_id);
    const subject = interpolate(config.subject, payload) || workflow.name;
    const body = interpolate(config.message, payload) || `Automation ${workflow.name} ran successfully.`;
    const { data, error } = await resend.emails.send({ from: getEmailFromAddress(), to, subject, text: `${branding.agencyName}\n\n${body}${branding.supportEmail ? `\n\nSupport: ${branding.supportEmail}` : ""}`, html: `<main style="font-family:Arial,sans-serif;background:#080a12;color:#f8fafc;padding:32px"><section style="max-width:620px;margin:auto;border:1px solid #243047;border-radius:20px;padding:28px"><p style="color:${branding.primaryColor};font-weight:700">${branding.agencyName}</p><h1>${subject}</h1><p style="color:#cbd5e1;line-height:1.7">${body}</p></section></main>` });
    if (error) throw new Error(error.message); return { emailId: data?.id ?? null, to };
  }
  if (action.type === "create_task") {
    const recipient = await resolveRecipient(workflow.organization_id, config.assignee ?? config.recipient, payload);
    const { data, error } = await admin.from("workflow_tasks").insert({ organization_id: workflow.organization_id, project_id: payload.projectId ?? null, workflow_run_id: runId, assigned_to: recipient.userId || null, title: interpolate(config.title, payload) || workflow.name, description: interpolate(config.description, payload) || null }).select("id").single();
    if (error) throw error; return { taskId: data.id };
  }
  if (action.type === "update_status") {
    if (!payload.projectId) throw new Error("update_status requires projectId.");
    const status = value(config.status); if (!status) throw new Error("update_status requires a status.");
    const { error } = await admin.from("client_projects").update({ status }).eq("id", payload.projectId).eq("organization_id", workflow.organization_id); if (error) throw error;
    return { projectId: payload.projectId, status };
  }
  if (action.type === "assign_member") {
    if (!payload.projectId) throw new Error("assign_member requires projectId.");
    const memberId = value(config.memberId) || value(payload.assignedMemberId); if (!memberId) throw new Error("assign_member requires memberId.");
    const { data: member, error: memberError } = await admin.from("organization_members").select("id,user_id").eq("id", memberId).eq("organization_id", workflow.organization_id).eq("status", "active").single(); if (memberError) throw memberError;
    const { error } = await admin.from("client_projects").update({ assigned_member_id: member.id, assigned_to: member.user_id }).eq("id", payload.projectId); if (error) throw error;
    return { projectId: payload.projectId, memberId };
  }
  if (action.type === "create_activity_log") {
    const { data, error } = await admin.from("team_activity_logs").insert({ organization_id: workflow.organization_id, user_id: payload.userId ?? null, action: value(config.action) || "workflow_activity", metadata: { workflowId: workflow.id, runId, ...payload } }).select("id").single(); if (error) throw error;
    return { activityId: data.id };
  }
  if (action.type === "create_project") {
    if (payload.projectId) return { projectId: payload.projectId, reused: true };
    if (!payload.leadId) throw new Error("create_project requires leadId.");
    const { data: lead, error: leadError } = await admin.from("leads").select("name,email,phone,notes,budget").eq("id", payload.leadId).eq("organization_id", workflow.organization_id).single(); if (leadError) throw leadError;
    const { data, error } = await admin.from("client_projects").insert({ organization_id: workflow.organization_id, client_name: lead.name, client_email: lead.email, client_phone: lead.phone, project_title: `${lead.name} Project`, project_description: lead.notes, budget: lead.budget, status: value(config.status) || "brief", created_by: payload.userId ?? null }).select("id").single(); if (error) throw error;
    return { projectId: data.id };
  }
  throw new Error(`Unsupported workflow action: ${action.type}`);
}

async function runWorkflow(workflow: WorkflowRow, payload: TriggerPayload) {
  const admin = createAdminClient();
  const { data: run, error } = await admin.from("workflow_runs").insert({ workflow_id: workflow.id, organization_id: workflow.organization_id, trigger_type: workflow.trigger_type, trigger_payload: payload, status: "running" }).select("id").single();
  if (error) throw error;
  let failure = "";
  for (const [index, action] of workflow.actions.entries()) {
    try {
      const output = await executeAction(workflow, run.id, action, payload);
      await admin.from("workflow_logs").insert({ workflow_run_id: run.id, workflow_id: workflow.id, organization_id: workflow.organization_id, action_type: action.type, action_index: index, status: "success", input: action.config, output });
    } catch (error) {
      failure = error instanceof Error ? error.message : "Workflow action failed.";
      await admin.from("workflow_logs").insert({ workflow_run_id: run.id, workflow_id: workflow.id, organization_id: workflow.organization_id, action_type: action.type, action_index: index, status: "failed", input: action.config, error_message: failure });
      break;
    }
  }
  const status = failure ? "failed" : "success";
  await admin.from("workflow_runs").update({ status, completed_at: new Date().toISOString(), error_message: failure || null }).eq("id", run.id);
  await admin.from("team_activity_logs").insert({ organization_id: workflow.organization_id, user_id: payload.userId ?? null, action: "workflow_executed", metadata: { workflowId: workflow.id, workflowName: workflow.name, runId: run.id, trigger: workflow.trigger_type, status, error: failure || null } });
  return { runId: run.id, status };
}

export async function dispatchWorkflowTrigger(organizationId: string, trigger: WorkflowTrigger, payload: TriggerPayload) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("workflows").select("id,organization_id,name,trigger_type,trigger_config,actions").eq("organization_id", organizationId).eq("status", "active").eq("trigger_type", trigger);
    if (error) throw error;
    const workflows = (data ?? []) as WorkflowRow[];
    return await Promise.all(workflows.filter((workflow) => matchesConfig(workflow.trigger_config ?? {}, payload)).map((workflow) => runWorkflow(workflow, payload)));
  } catch (error) {
    console.error("[workflows] dispatch failed", { organizationId, trigger, error });
    return [];
  }
}
