"use client";

import { formatInvoiceCurrency, type ProjectInvoiceItem } from "@/components/team/project-invoices";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function pdfText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildInvoicePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 12 Tf",
    "72 740 Td",
    ...lines.map((line, index) => `${index === 0 ? "" : "T* "}(${pdfText(line)}) Tj`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function downloadInvoice(invoice: ProjectInvoiceItem, agencyName: string, supportEmail?: string | null) {
  const lines = [
    `${agencyName} Invoice`,
    `Invoice: ${invoice.invoice_number ?? invoice.id}`,
    `Amount: ${formatInvoiceCurrency(invoice.amount, invoice.currency)}`,
    `Status: ${statusLabel(invoice.status)}`,
    `Issued: ${formatDate(invoice.issued_at)}`,
    invoice.paid_at ? `Paid: ${formatDate(invoice.paid_at)}` : "",
    invoice.notes ? `Notes: ${invoice.notes}` : "",
    supportEmail ? `Support: ${supportEmail}` : "",
  ].filter(Boolean);
  const blob = new Blob([buildInvoicePdf(lines)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${invoice.invoice_number ?? "invoice"}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ClientInvoices({ invoices, agencyName = "ReelMind AI", supportEmail }: { invoices: ProjectInvoiceItem[]; agencyName?: string; supportEmail?: string | null }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyberBlue">Invoices</p>
      <div className="mt-4 space-y-3">
        {invoices.length ? invoices.map((invoice) => (
          <article key={invoice.id} className="rounded-2xl border border-white/10 bg-ink/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-frost">{invoice.invoice_number ?? "Invoice"}</p>
                <p className="mt-1 text-xs text-mist">{formatInvoiceCurrency(invoice.amount, invoice.currency)} / {statusLabel(invoice.status)} / {formatDate(invoice.issued_at)}</p>
              </div>
              <button type="button" onClick={() => downloadInvoice(invoice, agencyName, supportEmail)} className="rounded-full border border-cyberBlue/40 px-3 py-1.5 text-xs font-semibold text-cyberBlue transition hover:bg-cyberBlue hover:text-ink">
                Download PDF
              </button>
            </div>
          </article>
        )) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-mist">No invoices available yet.</p>
        )}
      </div>
    </section>
  );
}
