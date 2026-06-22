import { NextResponse } from "next/server";
import { clientProjectUrl, sendMessageNotificationEmail } from "@/lib/email/send-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyProjectClient } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { canEditAssets } from "@/lib/team/permissions";

export const runtime = "nodejs";

function displayName(user: { email?: string | null }, activeTeamRole?: string | null) {
  return user.email ?? activeTeamRole ?? "Agency";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: project, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id,project_title,client_email")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, project.organization_id);
  if (!activeTeam || !canEditAssets(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to send messages." }, { status: 403 });
  }

  const senderName = displayName(user, activeTeam.membership.role);
  const { data: createdMessage, error } = await adminSupabase
    .from("project_messages")
    .insert({
      organization_id: project.organization_id,
      project_id: projectId,
      sender_type: "agency",
      sender_name: senderName,
      message,
    })
    .select("id,organization_id,project_id,sender_type,sender_name,message,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: project.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "agency_message_sent",
    metadata: {
      messagePreview: message.length > 80 ? `${message.slice(0, 80)}...` : message,
    },
  });

  await notifyProjectClient({
    organizationId: project.organization_id,
    projectId,
    type: "message_received",
    title: "New agency message",
    message: message.length > 120 ? `${message.slice(0, 120)}...` : message,
  });
  await sendMessageNotificationEmail({
    organizationId: project.organization_id,
    projectId,
    to: project.client_email,
    projectTitle: project.project_title,
    senderName,
    messagePreview: message.length > 120 ? `${message.slice(0, 120)}...` : message,
    projectUrl: await clientProjectUrl(projectId),
  });

  return NextResponse.json({ success: true, message: createdMessage });
}
