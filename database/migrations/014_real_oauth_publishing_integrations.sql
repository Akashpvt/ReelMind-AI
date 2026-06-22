create unique index if not exists connected_accounts_user_platform_unique_idx
  on public.connected_accounts (user_id, platform);

alter table public.connected_accounts
  add column if not exists access_token_encrypted text,
  add column if not exists refresh_token_encrypted text,
  add column if not exists expires_at timestamp with time zone,
  add column if not exists account_name text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.publishing_jobs
  add column if not exists thumbnail_url text,
  add column if not exists video_url text,
  add column if not exists error_message text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.publish_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;
