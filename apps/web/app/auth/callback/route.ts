import { NextResponse } from "next/server";
import { ensureUserRecords } from "@/lib/auth/ensure-user-records";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(next: string | null) {
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const destination = safeNextPath(requestUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await ensureUserRecords(supabase, user);

      const redirectUrl = new URL(destination, requestUrl.origin);
      if (destination === "/dashboard") {
        redirectUrl.searchParams.set("confirmed", "1");
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.redirect(new URL("/login?error=confirmation", requestUrl.origin));
}
