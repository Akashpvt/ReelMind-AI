import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [accountsResult, jobsResult, historyResult, scheduledResult] = await Promise.all([
    supabase
      .from("publishing_accounts")
      .select("id,platform,status,account_name,expires_at,created_at,updated_at")
      .eq("user_id", data.user.id)
      .order("platform", { ascending: true }),
    supabase
      .from("publishing_jobs")
      .select("id,project_id,platform,title,description,hashtags,status,scheduled_for,timezone,thumbnail_url,video_url,error_message,metadata,platform_payload,created_at,updated_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("publishing_history")
      .select("id,project_id,publishing_job_id,platform,action,status,detail,credits_used,metadata,created_at")
      .eq("user_id", data.user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("scheduled_posts")
      .select("id,project_id,publishing_job_id,platform,scheduled_for,timezone,status,payload,created_at,updated_at")
      .eq("user_id", data.user.id)
      .order("scheduled_for", { ascending: true })
      .limit(100),
  ]);

  const error = accountsResult.error ?? jobsResult.error ?? historyResult.error ?? scheduledResult.error;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    accounts: accountsResult.data ?? [],
    jobs: jobsResult.data ?? [],
    history: historyResult.data ?? [],
    scheduledPosts: scheduledResult.data ?? [],
  });
}
