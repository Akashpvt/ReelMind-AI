import { EnterpriseAdminDashboard } from "@/components/admin/enterprise-admin-dashboard";
import { requirePlatformAdminPage } from "@/lib/enterprise/admin-auth";

export const dynamic = "force-dynamic";

export default async function EnterpriseAdminPage() {
  const access = await requirePlatformAdminPage();
  return <EnterpriseAdminDashboard initialRole={access.role} />;
}
