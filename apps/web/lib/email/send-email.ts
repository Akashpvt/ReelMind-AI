import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend";
import { getWorkspaceBranding, type WorkspaceBranding } from "@/lib/team/branding";

type EmailContext = {
  organizationId: string;
  projectId?: string | null;
};

type EmailPayload = EmailContext & {
  to?: string | null;
  subject: string;
  preview: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  type: string;
};

type EventEmailInput = EmailContext & {
  to?: string | null;
  projectTitle: string;
  projectUrl?: string;
};

type InvoiceEmailInput = EventEmailInput & {
  invoiceNumber?: string | null;
  amount?: number | string;
};

function htmlTemplate({ preview, heading, body, ctaLabel, ctaUrl, agencyName, logoUrl, primaryColor, supportEmail, customFooter }: EmailPayload & WorkspaceBranding) {
  const action = ctaUrl && ctaLabel
    ? `<p style="margin-top:24px"><a href="${ctaUrl}" style="background:${primaryColor};color:#08111F;padding:12px 18px;border-radius:999px;text-decoration:none;font-weight:700">${ctaLabel}</a></p>`
    : "";
  return `
    <div style="display:none;max-height:0;overflow:hidden">${preview}</div>
    <main style="font-family:Inter,Arial,sans-serif;background:#08111F;color:#F8FAFC;padding:32px">
      <section style="max-width:620px;margin:0 auto;border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:28px;background:rgba(255,255,255,0.04)">
        ${logoUrl ? `<img src="${logoUrl}" alt="" width="44" height="44" style="object-fit:contain;border-radius:10px;margin-bottom:14px" />` : ""}
        <p style="margin:0 0 12px;color:${primaryColor};font-size:12px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700">${agencyName}</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2">${heading}</h1>
        <p style="margin:0;color:#CBD5E1;font-size:15px;line-height:1.7">${body}</p>
        ${action}${supportEmail ? `<p style="margin-top:24px;color:#94A3B8;font-size:12px">Support: ${supportEmail}</p>` : ""}${customFooter ? `<p style="margin-top:12px;color:#64748B;font-size:11px">${customFooter}</p>` : ""}
      </section>
    </main>
  `;
}

function textTemplate({ heading, body, ctaUrl, agencyName, supportEmail, customFooter }: EmailPayload & WorkspaceBranding) {
  return [agencyName, heading, body, ctaUrl ? `Open: ${ctaUrl}` : "", supportEmail ? `Support: ${supportEmail}` : "", customFooter].filter(Boolean).join("\n\n");
}

async function emailNotificationsEnabled(organizationId: string) {
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("organization_settings")
    .select("email_notifications_enabled")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data?.email_notifications_enabled ?? true;
}

async function logEmail(context: EmailContext, action: "email_sent" | "email_failed", metadata: Record<string, unknown>) {
  const adminSupabase = createAdminClient();
  await adminSupabase.from("team_activity_logs").insert({
    organization_id: context.organizationId,
    user_id: null,
    action,
    metadata: {
      projectId: context.projectId ?? null,
      ...metadata,
    },
  });
}

async function sendEmail(payload: EmailPayload) {
  if (!payload.to) {
    await logEmail(payload, "email_failed", { type: payload.type, reason: "missing_recipient", subject: payload.subject });
    return { ok: false, reason: "missing_recipient" };
  }

  if (!(await emailNotificationsEnabled(payload.organizationId))) {
    await logEmail(payload, "email_failed", { type: payload.type, reason: "disabled", to: payload.to, subject: payload.subject });
    return { ok: false, reason: "disabled" };
  }

  const resend = getResendClient();
  if (!resend) {
    await logEmail(payload, "email_failed", { type: payload.type, reason: "missing_resend_api_key", to: payload.to, subject: payload.subject });
    return { ok: false, reason: "missing_resend_api_key" };
  }

  const branding = await getWorkspaceBranding(payload.organizationId);
  const brandedPayload = { ...payload, ...branding };
  const { data, error } = await resend.emails.send({
    from: getEmailFromAddress(),
    to: payload.to,
    subject: payload.subject,
    html: htmlTemplate(brandedPayload),
    text: textTemplate(brandedPayload),
  });

  if (error) {
    await logEmail(payload, "email_failed", { type: payload.type, to: payload.to, subject: payload.subject, error: error.message });
    return { ok: false, reason: error.message };
  }

  await logEmail(payload, "email_sent", { type: payload.type, to: payload.to, subject: payload.subject, emailId: data?.id ?? null });
  return { ok: true, id: data?.id ?? null };
}

export function sendProjectAssignedEmail(input: EventEmailInput & { memberName?: string | null }) {
  return sendEmail({
    ...input,
    type: "project_assigned",
    subject: `Project assigned: ${input.projectTitle}`,
    preview: `${input.projectTitle} was assigned to you.`,
    heading: "Project Assigned",
    body: `${input.projectTitle} has been assigned to ${input.memberName ?? "you"}.`,
    ctaLabel: "Open project",
    ctaUrl: input.projectUrl,
  });
}

export function sendStatusUpdateEmail(input: EventEmailInput & { previousStatus: string; newStatus: string }) {
  const isReview = input.newStatus === "review";
  return sendEmail({
    ...input,
    type: "project_status_changed",
    subject: isReview ? `Approval requested: ${input.projectTitle}` : `Project status changed: ${input.projectTitle}`,
    preview: `${input.projectTitle} moved from ${input.previousStatus} to ${input.newStatus}.`,
    heading: isReview ? "Approval Requested" : "Project Status Changed",
    body: `${input.projectTitle} moved from ${input.previousStatus} to ${input.newStatus}.`,
    ctaLabel: "View project",
    ctaUrl: input.projectUrl,
  });
}

export function sendClientApprovalEmail(input: EventEmailInput) {
  return sendEmail({
    ...input,
    type: "client_approval",
    subject: `Project approved: ${input.projectTitle}`,
    preview: `${input.projectTitle} has been approved.`,
    heading: "Client Approval",
    body: `${input.projectTitle} has been approved and is ready for the next step.`,
    ctaLabel: "View project",
    ctaUrl: input.projectUrl,
  });
}

export function sendRevisionRequestEmail(input: EventEmailInput) {
  return sendEmail({
    ...input,
    type: "revision_request",
    subject: `Revision requested: ${input.projectTitle}`,
    preview: `${input.projectTitle} needs revisions.`,
    heading: "Revision Request",
    body: `${input.projectTitle} has a revision request. Please review the latest project notes and messages.`,
    ctaLabel: "View project",
    ctaUrl: input.projectUrl,
  });
}

export function sendInvoiceCreatedEmail(input: InvoiceEmailInput) {
  return sendEmail({
    ...input,
    type: "invoice_created",
    subject: `Invoice generated: ${input.invoiceNumber ?? input.projectTitle}`,
    preview: `A new invoice is ready for ${input.projectTitle}.`,
    heading: "Invoice Created",
    body: `${input.invoiceNumber ?? "An invoice"} for ${input.projectTitle}${input.amount ? ` totaling ${input.amount}` : ""} is ready.`,
    ctaLabel: "View invoice",
    ctaUrl: input.projectUrl,
  });
}

export function sendInvoicePaidEmail(input: InvoiceEmailInput) {
  return sendEmail({
    ...input,
    type: "invoice_paid",
    subject: `Invoice paid: ${input.invoiceNumber ?? input.projectTitle}`,
    preview: `${input.invoiceNumber ?? "Invoice"} has been marked paid.`,
    heading: "Invoice Paid",
    body: `${input.invoiceNumber ?? "The invoice"} for ${input.projectTitle} has been marked paid.`,
    ctaLabel: "View project",
    ctaUrl: input.projectUrl,
  });
}

export function sendMessageNotificationEmail(input: EventEmailInput & { messagePreview: string; senderName?: string }) {
  return sendEmail({
    ...input,
    type: "message_received",
    subject: `New message: ${input.projectTitle}`,
    preview: input.messagePreview,
    heading: "New Message",
    body: `${input.senderName ?? "A teammate"} sent a message on ${input.projectTitle}: ${input.messagePreview}`,
    ctaLabel: "Open conversation",
    ctaUrl: input.projectUrl,
  });
}

export function sendFileUploadedEmail(input: EventEmailInput & { fileName: string }) {
  return sendEmail({
    ...input,
    type: "file_uploaded",
    subject: `File uploaded: ${input.fileName}`,
    preview: `${input.fileName} was uploaded for ${input.projectTitle}.`,
    heading: "File Uploaded",
    body: `${input.fileName} was uploaded for ${input.projectTitle}.`,
    ctaLabel: "View files",
    ctaUrl: input.projectUrl,
  });
}

function appBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "";
}

export function agencyProjectUrl(projectId: string) {
  return `${appBaseUrl()}/dashboard/team/projects/${projectId}`;
}

export async function clientProjectUrl(projectId: string) {
  const adminSupabase = createAdminClient();
  const { data } = await adminSupabase
    .from("client_project_access")
    .select("access_token")
    .eq("project_id", projectId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.access_token ? `${appBaseUrl()}/client/project/${data.access_token}` : undefined;
}
