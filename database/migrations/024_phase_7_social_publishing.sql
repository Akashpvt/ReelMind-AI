create table if not exists public.publishing_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  status text not null default 'Not Connected',
  account_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint publishing_accounts_platform_check check (platform in ('YouTube', 'Instagram', 'TikTok', 'Facebook')),
  constraint publishing_accounts_status_check check (status in ('Connected', 'Not Connected', 'Expired'))
);

create unique index if not exists publishing_accounts_user_platform_unique_idx
  on public.publishing_accounts (user_id, platform);

insert into public.publishing_accounts (
  user_id,
  platform,
  status,
  account_name,
  access_token_encrypted,
  refresh_token_encrypted,
  expires_at,
  metadata,
  created_at,
  updated_at
)
select
  user_id,
  platform,
  status,
  account_name,
  access_token_encrypted,
  refresh_token_encrypted,
  expires_at,
  metadata,
  created_at,
  updated_at
from public.connected_accounts
on conflict (user_id, platform) do nothing;

alter table public.publishing_jobs
  drop constraint if exists publishing_jobs_status_check;

alter table public.publishing_jobs
  add constraint publishing_jobs_status_check
  check (status in ('Draft', 'Scheduled', 'Publishing', 'Published', 'Failed', 'Manual Publish Ready'));

alter table public.publishing_jobs
  add column if not exists package_type text,
  add column if not exists visibility text,
  add column if not exists privacy_status text,
  add column if not exists category text,
  add column if not exists page_id text,
  add column if not exists platform_payload jsonb not null default '{}'::jsonb;

create table if not exists public.publishing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete set null,
  publishing_job_id uuid references public.publishing_jobs(id) on delete set null,
  platform text not null,
  action text not null,
  status text not null,
  detail text,
  credits_used integer not null default 0 check (credits_used >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint publishing_history_platform_check check (platform in ('YouTube', 'Instagram', 'TikTok', 'Facebook', 'Manual Export'))
);

create table if not exists public.scheduled_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  publishing_job_id uuid references public.publishing_jobs(id) on delete cascade,
  platform text not null,
  scheduled_for timestamp with time zone not null,
  timezone text not null default 'UTC',
  status text not null default 'Scheduled',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint scheduled_posts_platform_check check (platform in ('YouTube', 'Instagram', 'TikTok', 'Facebook')),
  constraint scheduled_posts_status_check check (status in ('Scheduled', 'Published', 'Failed', 'Canceled'))
);

create index if not exists publishing_history_user_created_at_idx
  on public.publishing_history (user_id, created_at desc);

create index if not exists scheduled_posts_user_scheduled_for_idx
  on public.scheduled_posts (user_id, scheduled_for asc);

alter table public.publishing_accounts enable row level security;
alter table public.publishing_history enable row level security;
alter table public.scheduled_posts enable row level security;

drop policy if exists "Users can manage their publishing accounts" on public.publishing_accounts;
create policy "Users can manage their publishing accounts"
  on public.publishing_accounts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their publishing history" on public.publishing_history;
create policy "Users can manage their publishing history"
  on public.publishing_history for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can manage their scheduled posts" on public.scheduled_posts;
create policy "Users can manage their scheduled posts"
  on public.scheduled_posts for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
