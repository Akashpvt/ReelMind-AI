import { LaunchReadinessDashboard } from "@/components/admin/launch-readiness-dashboard";
import { requirePlatformAdminPage } from "@/lib/enterprise/admin-auth";

export const dynamic = "force-dynamic";
export default async function LaunchPage() { await requirePlatformAdminPage(); return <LaunchReadinessDashboard/>; }
