import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function slugify(value: string) {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || `team-${Date.now()}`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: unknown; slug?: unknown };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Organization name is required." }, { status: 400 });
  }

  const baseSlug = typeof body.slug === "string" && body.slug.trim() ? slugify(body.slug) : slugify(name);
  const slug = `${baseSlug}-${user.id.slice(0, 6)}`;

  const { data: organization, error: organizationError } = await supabase.rpc(
    "create_organization_with_owner",
    {
      organization_name: name,
      organization_slug: slug,
    },
  );

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, organization });
}
