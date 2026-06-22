import { NextResponse } from "next/server";
import { dispatchWorkflowTrigger } from "@/lib/workflows/engine";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";
import { clientProjectUrl, sendInvoicePaidEmail } from "@/lib/email/send-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyProjectClient } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { canManageClientProjects } from "@/lib/team/project-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : "";
  if (!invoiceId) return NextResponse.json({ error: "invoiceId is required." }, { status: 400 });

  const adminSupabase = createAdminClient();
  const { data: invoice, error: invoiceError } = await adminSupabase
    .from("project_invoices")
    .select("id,organization_id,project_id,invoice_number,status,amount")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: invoiceError?.message ?? "Invoice not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, invoice.organization_id);
  if (!activeTeam || !canManageClientProjects(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to update invoices." }, { status: 403 });
  }

  const { data: updatedInvoice, error } = await adminSupabase
    .from("project_invoices")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", invoiceId)
    .select("id,organization_id,project_id,invoice_number,amount,currency,status,issued_at,paid_at,notes,created_by,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: invoice.organization_id,
    project_id: invoice.project_id,
    user_id: user.id,
    action: "invoice_paid",
    metadata: { invoiceNumber: invoice.invoice_number, amount: invoice.amount },
  });

  await notifyProjectClient({
    organizationId: invoice.organization_id,
    projectId: invoice.project_id,
    type: "invoice_paid",
    title: "Invoice paid",
    message: `${invoice.invoice_number ?? "Invoice"} has been marked paid.`,
  });
  const { data: project } = await adminSupabase
    .from("client_projects")
    .select("id,project_title,client_name,client_email,client_phone")
    .eq("id", invoice.project_id)
    .maybeSingle();
  await sendInvoicePaidEmail({
    organizationId: invoice.organization_id,
    projectId: invoice.project_id,
    to: project?.client_email ?? null,
    projectTitle: project?.project_title ?? "Project",
    invoiceNumber: invoice.invoice_number,
    amount: invoice.amount,
    projectUrl: await clientProjectUrl(invoice.project_id),
  });

  await dispatchWorkflowTrigger(invoice.organization_id, "invoice_paid", { userId: user.id, projectId: invoice.project_id, projectTitle: project?.project_title ?? "Project", clientEmail: project?.client_email ?? undefined, invoiceId: invoice.id, invoiceNumber: invoice.invoice_number ?? "Invoice", amount: invoice.amount });
  await notifyWhatsAppEvent(invoice.organization_id,"payment_received",{phone:project?.client_phone,projectId:invoice.project_id,name:project?.client_name,projectTitle:project?.project_title,invoiceNumber:invoice.invoice_number,amount:invoice.amount});
  return NextResponse.json({ success: true, invoice: updatedInvoice });
}
