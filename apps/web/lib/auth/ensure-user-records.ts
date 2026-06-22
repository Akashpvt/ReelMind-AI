import type { SupabaseClient, User } from "@supabase/supabase-js";

type UserRecordMetadata = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

function userMetadata(user: User): UserRecordMetadata {
  const metadata = user.user_metadata ?? {};
  return {
    email: user.email,
    fullName: typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : null,
    avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
  };
}

export async function ensureUserRecords(supabase: SupabaseClient, user: User | null, overrides: UserRecordMetadata = {}) {
  if (!user) return;

  const metadata = userMetadata(user);
  await supabase.rpc("ensure_auth_profile_and_usage", {
    profile_email: overrides.email ?? metadata.email ?? null,
    profile_full_name: overrides.fullName ?? metadata.fullName ?? null,
    profile_avatar_url: overrides.avatarUrl ?? metadata.avatarUrl ?? null,
  });
}
