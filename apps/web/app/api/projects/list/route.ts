import { NextResponse } from "next/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizationId = new URL(request.url).searchParams.get("organizationId");
  const activeTeam = await resolveActiveTeam(user.id, organizationId);

  if (!activeTeam) {
    return NextResponse.json({ projects: [], organization: null });
  }

  const { data: projects, error } = await supabase
    .from("client_projects")
    .select("id,organization_id,client_name,client_email,project_title,project_description,status,priority,budget,deadline,assigned_to,assigned_member_id,assigned_member_name,created_by,created_at,updated_at")
    .eq("organization_id", activeTeam.organization.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ projects: projects ?? [], organization: activeTeam.organization });
}
