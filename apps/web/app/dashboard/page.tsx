import { redirect } from "next/navigation";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { createClient } from "@/lib/supabase/server";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { getWorkspaceBranding } from "@/lib/team/branding";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const team = await resolveActiveTeam(user.id);
  const branding = team ? await getWorkspaceBranding(team.organization.id, team.organization.name) : null;
  return <DashboardWorkspace email={user.email ?? "Creator"} userId={user.id} branding={branding} />;
}
