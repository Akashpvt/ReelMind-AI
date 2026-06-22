import { NextResponse } from "next/server";
import { getEmailFromAddress, getResendClient } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character] ?? character);
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const submittedAt = clean(body.submittedAt, 64);
    const honeypot = clean(body.website, 200);

    if (honeypot || (submittedAt && Date.now() - Number(submittedAt) < 1200)) {
      return NextResponse.json({ ok: true });
    }

    const payload = {
      name: clean(body.name, 120),
      email: clean(body.email, 254).toLowerCase(),
      company: clean(body.company, 160),
      phone: clean(body.phone, 40) || null,
      agency_size: clean(body.agencySize, 60),
      message: clean(body.message, 2000) || null,
      source: "public_website",
    };

    if (!payload.name || !payload.company || !payload.agency_size || !emailPattern.test(payload.email)) {
      return NextResponse.json({ error: "Please complete all required fields with a valid email." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: demoRequest, error } = await supabase
      .from("public_demo_requests")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[demo] request persistence failed", error);
      return NextResponse.json({ error: "We could not save your request. Please try again." }, { status: 500 });
    }

    const organizationId = process.env.DEMO_NOTIFICATION_ORGANIZATION_ID;
    if (organizationId) {
      const { data: owners } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .in("role", ["owner", "admin"]);

      if (owners?.length) {
        await supabase.from("notifications").insert(owners.map((owner) => ({
          organization_id: organizationId,
          user_id: owner.user_id,
          title: "New demo request",
          message: `${payload.name} from ${payload.company} requested a demo.`,
          type: "demo_requested",
        })));
      }
    }

    const resend = getResendClient();
    const notificationEmail = process.env.DEMO_NOTIFICATION_EMAIL;
    if (resend && notificationEmail) {
      const lines = [
        ["Name", payload.name], ["Email", payload.email], ["Company", payload.company],
        ["Phone", payload.phone ?? "Not provided"], ["Agency size", payload.agency_size],
        ["Message", payload.message ?? "Not provided"],
      ];
      await resend.emails.send({
        from: getEmailFromAddress(),
        to: notificationEmail,
        replyTo: payload.email,
        subject: `Demo request: ${payload.company}`,
        html: `<main style="font-family:Arial,sans-serif;background:#080a12;color:#f8fafc;padding:32px"><div style="max-width:620px;margin:auto;border:1px solid #243047;border-radius:20px;padding:28px"><p style="color:#38bdf8;text-transform:uppercase;letter-spacing:.16em">ReelMind AI</p><h1>New demo request</h1>${lines.map(([label, value]) => `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`).join("")}</div></main>`,
      });
    }

    return NextResponse.json({ ok: true, id: demoRequest.id }, { status: 201 });
  } catch (error) {
    console.error("[demo] unexpected error", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
