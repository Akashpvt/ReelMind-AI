import { SecurityOperationsDashboard } from "@/components/admin/security-operations-dashboard";
import { requirePlatformAdminPage } from "@/lib/enterprise/admin-auth";

export const dynamic = "force-dynamic";
export default async function SecurityPage() { await requirePlatformAdminPage(); return <SecurityOperationsDashboard/>; }
