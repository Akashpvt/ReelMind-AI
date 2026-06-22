import { TeamShell } from "@/components/team/team-shell";
import { WorkflowBuilder } from "@/components/team/workflow-builder";
import { requirePagePermission } from "@/lib/team/permission-guards";

export const dynamic = "force-dynamic";
export default async function WorkflowsPage() {
  const access = await requirePagePermission("projects:manage", "/dashboard/team/workflows");
  return <TeamShell title="Automation Workflows" subtitle="Turn repeatable agency events into reliable actions, without the tab-hopping tax."><WorkflowBuilder organizationId={access.organizationId} /></TeamShell>;
}
