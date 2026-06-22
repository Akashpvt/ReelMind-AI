import { TeamShell } from "@/components/team/team-shell";
import { WhatsAppDashboard } from "@/components/team/whatsapp-dashboard";
import { requirePagePermission } from "@/lib/team/permission-guards";
export const dynamic="force-dynamic";
export default async function WhatsAppPage(){const access=await requirePagePermission("projects:manage","/dashboard/team/whatsapp");return <TeamShell title="WhatsApp Business" subtitle="Client conversations, operational alerts, and self-serve project answers—connected to the work itself."><WhatsAppDashboard organizationId={access.organizationId}/></TeamShell>;}
