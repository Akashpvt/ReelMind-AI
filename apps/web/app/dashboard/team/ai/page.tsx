import { AiAgencyDashboard } from "@/components/team/ai-agency-dashboard";
import { TeamShell } from "@/components/team/team-shell";
import { requirePagePermission } from "@/lib/team/permission-guards";

export const dynamic="force-dynamic";
export default async function AiAgencyPage(){const access=await requirePagePermission("analytics:view","/dashboard/team/ai");return <TeamShell title="AI Agency Employees" subtitle="Five always-on operators reading the same live workspace context—and turning it into the next useful move."><AiAgencyDashboard organizationId={access.organizationId}/></TeamShell>;}
