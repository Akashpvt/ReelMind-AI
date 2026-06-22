import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { inviteToken?: unknown; token?: unknown };
  const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken.trim() : typeof body.token === "string" ? body.token.trim() : "";
  if (!inviteToken) {
    return NextResponse.json({ error: "Invitation token is required." }, { status: 400 });
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("organization_invites")
    .select("id,organization_id,email,role,expires_at")
    .eq("invite_token", inviteToken)
    .maybeSingle();

  if (invitationError) {
    return NextResponse.json({ error: invitationError.message }, { status: 400 });
  }

  const invite = invitation as { id: string; organization_id: string; email: string; role: string; expires_at: string } | null;
  if (!invite || Date.parse(invite.expires_at) < Date.now()) {
    return NextResponse.json({ error: "Invitation is expired or unavailable." }, { status: 404 });
  }

  if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "This invitation belongs to a different email." }, { status: 403 });
  }

  const { error: memberError } = await supabase.from("organization_members").upsert(
    {
      organization_id: invite.organization_id,
      user_id: user.id,
      role: invite.role,
      status: "active",
      invited_by: null,
      joined_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id" },
  );

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  await supabase.from("team_activity_logs").insert({
    organization_id: invite.organization_id,
    user_id: user.id,
    action: "invite_accepted",
    metadata: { email: user.email, role: invite.role },
  });

  return NextResponse.json({ success: true, organizationId: invite.organization_id, role: invite.role });
}
