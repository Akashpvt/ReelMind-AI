import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

function portalUrl(request: Request, token: string) {
  return new URL(`/client/project/${token}`, request.url).toString();
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
  const clientEmail = typeof body.clientEmail === "string" ? body.clientEmail.trim().toLowerCase() : "";

  if (!projectId || !clientEmail) {
    return NextResponse.json({ error: "projectId and clientEmail are required." }, { status: 400 });
  }

  const adminSupabase = createAdminClient();
  const { data: project, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, project.organization_id);
  if (!activeTeam) {
    return NextResponse.json({ error: "Only active agency members can create client access links." }, { status: 403 });
  }

  const accessToken = randomBytes(24).toString("hex");
  const { data: access, error } = await adminSupabase
    .from("client_project_access")
    .upsert({
      organization_id: project.organization_id,
      project_id: projectId,
      client_email: clientEmail,
      access_token: accessToken,
      status: "active",
      expires_at: null,
    }, { onConflict: "project_id,client_email" })
    .select("id,organization_id,project_id,client_email,access_token,status,expires_at,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    access,
    portalUrl: portalUrl(request, access.access_token),
    path: `/client/project/${access.access_token}`,
  });
}
