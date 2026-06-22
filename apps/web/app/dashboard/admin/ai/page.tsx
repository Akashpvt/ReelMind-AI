import { AiOperationsDashboard } from "@/components/admin/ai-operations-dashboard";
import { requirePlatformAdminPage } from "@/lib/enterprise/admin-auth";

export const dynamic="force-dynamic";
export default async function AdminAiPage(){await requirePlatformAdminPage();return <AiOperationsDashboard/>;}
