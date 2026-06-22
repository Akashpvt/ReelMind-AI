import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "projectId is required." }, { status: 400 });
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
    return NextResponse.json({ error: "User must be an active organization member to view messages." }, { status: 403 });
  }

  const { data: messages, error } = await adminSupabase
    .from("project_messages")
    .select("id,organization_id,project_id,sender_type,sender_name,message,created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: messages ?? [] });
}
