import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    organizationId?: unknown;
    projectName?: unknown;
    status?: unknown;
  };
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const projectName = typeof body.projectName === "string" ? body.projectName.trim() : "";
  if (!organizationId || !projectName) {
    return NextResponse.json({ error: "Organization and project name are required." }, { status: 400 });
  }

  const { data: role } = await supabase.rpc("current_org_role", { target_organization_id: organizationId });
  if (!["owner", "admin", "manager"].includes(String(role))) {
    return NextResponse.json({ error: "Only owners, admins, and managers can create client projects." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("client_projects")
    .insert({
      organization_id: organizationId,
      client_name: "Client",
      project_title: projectName,
      status: typeof body.status === "string" ? body.status : "brief",
      priority: "medium",
      created_by: user.id,
    })
    .select("id,organization_id,client_name,client_email,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from("team_activity_logs").insert({
    organization_id: organizationId,
    user_id: user.id,
    action: "client_project_created",
    metadata: { projectName },
  });

  return NextResponse.json({ success: true, project: data });
}
