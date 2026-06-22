import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [transactionsResult, generationHistoryResult] = await Promise.all([
    supabase
      .from("credit_transactions")
      .select("id,user_id,action,credits_used,credits_added,source,status,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("generation_history")
      .select("id,user_id,project_id,event_type,thumbnail_url,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (transactionsResult.error) {
    return NextResponse.json({ error: transactionsResult.error.message }, { status: 500 });
  }

  if (generationHistoryResult.error) {
    return NextResponse.json({ error: generationHistoryResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    transactions: transactionsResult.data ?? [],
    generationHistory: generationHistoryResult.data ?? [],
  });
}
