import { ContentAiStudio } from "@/components/team/content-ai-studio";
import { TeamShell } from "@/components/team/team-shell";
import { requirePagePermission } from "@/lib/team/permission-guards";

export const dynamic = "force-dynamic";

export default async function ContentAiPage() {
  const access = await requirePagePermission("content:edit", "/dashboard/team/content-ai");
  return <TeamShell title="AI Content Studio" subtitle="Turn a brief into hooks, scripts, calendars, brand intelligence, and client-ready strategy—without leaving the agency workspace."><ContentAiStudio organizationId={access.organizationId} /></TeamShell>;
}
