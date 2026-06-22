create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  platform text not null,
  status text not null default 'Not Connected',
  account_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint connected_accounts_platform_check check (platform in ('YouTube', 'Instagram', 'TikTok', 'Facebook')),
  constraint connected_accounts_status_check check (status in ('Connected', 'Not Connected', 'Expired'))
);

create table if not exists public.publishing_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  platform text not null,
  title text not null,
  description text,
  hashtags text,
  thumbnail_url text,
  video_url text,
  status text not null default 'Draft',
  scheduled_for timestamp with time zone,
  timezone text not null default 'UTC',
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint publishing_jobs_platform_check check (platform in ('YouTube', 'Instagram', 'TikTok', 'Facebook')),
  constraint publishing_jobs_status_check check (status in ('Draft', 'Scheduled', 'Publishing', 'Published', 'Failed'))
);

create table if not exists public.publish_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  publishing_job_id uuid references public.publishing_jobs(id) on delete cascade,
  event_type text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists connected_accounts_user_platform_idx
  on public.connected_accounts (user_id, platform);

create index if not exists publishing_jobs_user_status_idx
  on public.publishing_jobs (user_id, status, created_at desc);

create index if not exists publishing_jobs_project_created_at_idx
  on public.publishing_jobs (project_id, created_at desc);

create index if not exists publish_events_job_created_at_idx
  on public.publish_events (publishing_job_id, created_at desc);

create index if not exists publish_events_user_created_at_idx
  on public.publish_events (user_id, created_at desc);

alter table public.connected_accounts enable row level security;
alter table public.publishing_jobs enable row level security;
alter table public.publish_events enable row level security;

drop policy if exists "Users can manage their connected accounts" on public.connected_accounts;
create policy "Users can manage their connected accounts"
  on public.connected_accounts for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their publishing jobs" on public.publishing_jobs;
create policy "Users can manage their publishing jobs"
  on public.publishing_jobs for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their publish events" on public.publish_events;
create policy "Users can manage their publish events"
  on public.publish_events for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
