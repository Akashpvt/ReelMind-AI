import { TeamShell } from "@/components/team/team-shell";
import { WorkspaceSettings } from "@/components/team/workspace-settings";
import { getWorkspaceBranding } from "@/lib/team/branding";
import { requirePagePermission } from "@/lib/team/permission-guards";

export const dynamic = "force-dynamic";
export default async function SettingsPage() {
  const access = await requirePagePermission("settings:manage", "/dashboard/team/settings");
  const branding = await getWorkspaceBranding(access.organizationId, access.team.organization.name);
  return <TeamShell title="Workspace Settings" subtitle="Control your agency identity, client-facing brand, domain preparation, and security defaults." branding={branding}><WorkspaceSettings organizationId={access.organizationId} initial={branding} /></TeamShell>;
}
