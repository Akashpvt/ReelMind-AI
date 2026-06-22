import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyActiveOrganizationMembers } from "@/lib/team/notifications";

export const runtime = "nodejs";

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: access, error: accessError } = await adminSupabase
    .from("client_project_access")
    .select("id,organization_id,project_id,client_email,status,expires_at")
    .eq("access_token", token)
    .single();

  if (accessError || !access || access.status !== "active" || isExpired(access.expires_at)) {
    return NextResponse.json({ error: "Client portal link is invalid or expired." }, { status: 404 });
  }

  const { data: createdMessage, error } = await adminSupabase
    .from("project_messages")
    .insert({
      organization_id: access.organization_id,
      project_id: access.project_id,
      sender_type: "client",
      sender_name: "Client",
      message,
    })
    .select("id,organization_id,project_id,sender_type,sender_name,message,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: access.organization_id,
    project_id: access.project_id,
    user_id: null,
    action: "client_message_sent",
    metadata: {
      clientEmail: access.client_email,
      messagePreview: message.length > 80 ? `${message.slice(0, 80)}...` : message,
    },
  });

  await notifyActiveOrganizationMembers({
    organizationId: access.organization_id,
    projectId: access.project_id,
    type: "message_received",
    title: "New client message",
    message: message.length > 120 ? `${message.slice(0, 120)}...` : message,
  });

  return NextResponse.json({ success: true, message: createdMessage });
}
