import { NextResponse } from "next/server";
import { notifyWhatsAppEvent } from "@/lib/whatsapp/service";
import { clientProjectUrl, sendInvoiceCreatedEmail } from "@/lib/email/send-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyProjectClient } from "@/lib/team/notifications";
import { resolveActiveTeam } from "@/lib/team/resolve-active-team";
import { canManageClientProjects } from "@/lib/team/project-types";

export const runtime = "nodejs";

function invoiceNumber(index: number) {
  return `INV-${String(index).padStart(4, "0")}`;
}

type InvoiceRow = {
  id: string;
  organization_id: string;
  project_id: string;
  invoice_number: string | null;
  amount: number | string;
  currency: string;
  status: string;
  issued_at: string;
  paid_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  const notes = typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null;

  if (!projectId) return NextResponse.json({ error: "projectId is required." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });

  const adminSupabase = createAdminClient();
  const { data: project, error: projectError } = await adminSupabase
    .from("client_projects")
    .select("id,organization_id,project_title,client_name,client_email,client_phone")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    return NextResponse.json({ error: projectError?.message ?? "Project not found." }, { status: 404 });
  }

  const activeTeam = await resolveActiveTeam(user.id, project.organization_id);
  if (!activeTeam || !canManageClientProjects(activeTeam.membership.role)) {
    return NextResponse.json({ error: "User must be an active organization member to create invoices." }, { status: 403 });
  }

  const { count } = await adminSupabase
    .from("project_invoices")
    .select("id", { count: "exact", head: true });
  const baseIndex = (count ?? 0) + 1;
  let createdInvoice: InvoiceRow | null = null;
  let createError: { message: string } | null = null;

  for (let offset = 0; offset < 5; offset += 1) {
    const { data, error } = await adminSupabase
      .from("project_invoices")
      .insert({
        organization_id: project.organization_id,
        project_id: projectId,
        invoice_number: invoiceNumber(baseIndex + offset),
        amount,
        currency: "USD",
        status: "pending",
        notes,
        created_by: user.id,
      })
      .select("id,organization_id,project_id,invoice_number,amount,currency,status,issued_at,paid_at,notes,created_by,created_at")
      .single();
    if (!error) {
      createdInvoice = data;
      createError = null;
      break;
    }
    createError = error;
  }

  if (!createdInvoice) {
    return NextResponse.json({ error: createError?.message ?? "Unable to create invoice." }, { status: 400 });
  }

  await adminSupabase.from("project_activity_logs").insert({
    organization_id: project.organization_id,
    project_id: projectId,
    user_id: user.id,
    action: "invoice_created",
    metadata: {
      projectTitle: project.project_title,
      invoiceNumber: createdInvoice.invoice_number,
      amount,
    },
  });

  await notifyProjectClient({
    organizationId: project.organization_id,
    projectId,
    type: "invoice_created",
    title: "Invoice created",
    message: `${createdInvoice.invoice_number ?? "Invoice"} for ${project.project_title} is ready.`,
  });
  await sendInvoiceCreatedEmail({
    organizationId: project.organization_id,
    projectId,
    to: project.client_email,
    projectTitle: project.project_title,
    invoiceNumber: createdInvoice.invoice_number,
    amount,
    projectUrl: await clientProjectUrl(projectId),
  });
  await notifyWhatsAppEvent(project.organization_id,"invoice_created",{phone:project.client_phone,projectId,name:project.client_name,projectTitle:project.project_title,invoiceNumber:createdInvoice.invoice_number,amount:`${createdInvoice.currency} ${createdInvoice.amount}`});

  return NextResponse.json({ success: true, invoice: createdInvoice });
}
