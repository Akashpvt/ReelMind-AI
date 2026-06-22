import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function isExpired(expiresAt: string | null) {
  return Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now());
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const adminSupabase = createAdminClient();
  const { data: access, error: accessError } = await adminSupabase
    .from("client_project_access")
    .select("id,organization_id,project_id,client_email,access_token,status,expires_at")
    .eq("access_token", token)
    .single();

  if (accessError || !access || access.status !== "active" || isExpired(access.expires_at)) {
    return NextResponse.json({ error: "Client portal link is invalid or expired." }, { status: 404 });
  }

  const [projectResult, deliverablesResult, notesResult, invoicesResult, notificationsResult] = await Promise.all([
    adminSupabase
      .from("client_projects")
      .select("id,organization_id,client_name,client_email,project_title,project_description,status,priority,budget,deadline,created_at,updated_at")
      .eq("id", access.project_id)
      .single(),
    adminSupabase
      .from("project_deliverables")
      .select("id,file_name,file_url,created_at")
      .eq("project_id", access.project_id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_notes")
      .select("id,note,created_at")
      .eq("project_id", access.project_id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("project_invoices")
      .select("id,organization_id,project_id,invoice_number,amount,currency,status,issued_at,paid_at,notes,created_by,created_at")
      .eq("project_id", access.project_id)
      .order("created_at", { ascending: false }),
    adminSupabase
      .from("notifications")
      .select("id,organization_id,user_id,project_id,title,message,type,is_read,created_at")
      .eq("project_id", access.project_id)
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (projectResult.error || !projectResult.data) {
    return NextResponse.json({ error: projectResult.error?.message ?? "Project not found." }, { status: 404 });
  }

  return NextResponse.json({
    access,
    project: projectResult.data,
    deliverables: deliverablesResult.data ?? [],
    invoices: invoicesResult.data ?? [],
    notifications: notificationsResult.data ?? [],
    notes: notesResult.data ?? [],
    approvalStatus: projectResult.data.status,
  });
}
