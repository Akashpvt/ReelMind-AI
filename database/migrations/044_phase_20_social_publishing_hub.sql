create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  platform text not null, external_account_id text not null, account_name text, access_token_encrypted text not null,
  refresh_token_encrypted text, token_expires_at timestamptz, scopes text[], status text not null default 'connected', metadata jsonb not null default '{}'::jsonb,
  connected_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(organization_id,platform,external_account_id), constraint social_accounts_platform_check check(platform in('instagram','facebook','linkedin','youtube')),
  constraint social_accounts_status_check check(status in('connected','expired','disconnected','error'))
);
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id uuid references public.social_accounts(id) on delete set null, project_id uuid references public.client_projects(id) on delete set null,
  bulk_group_id uuid, platform text not null, title text, caption text not null, hashtags text[] not null default '{}', cta text,
  media_url text, media_type text not null default 'text', status text not null default 'draft', external_post_id text, external_url text,
  error_message text, published_at timestamptz, created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint social_posts_platform_check check(platform in('instagram','facebook','linkedin','youtube')),
  constraint social_posts_status_check check(status in('draft','scheduled','publishing','published','failed','cancelled')),
  constraint social_posts_media_check check(media_type in('text','image','video','reel','short'))
);
create table if not exists public.social_schedules (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid not null unique references public.social_posts(id) on delete cascade, scheduled_for timestamptz not null, timezone text not null default 'UTC',
  status text not null default 'scheduled', attempts integer not null default 0, last_attempt_at timestamptz, error_message text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint social_schedules_status_check check(status in('scheduled','processing','published','failed','cancelled'))
);
create table if not exists public.social_metrics (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  post_id uuid not null references public.social_posts(id) on delete cascade, platform text not null, impressions bigint not null default 0,
  reach bigint not null default 0, views bigint not null default 0, likes bigint not null default 0, comments bigint not null default 0,
  shares bigint not null default 0, clicks bigint not null default 0, engagement_rate numeric not null default 0,
  raw_metrics jsonb not null default '{}'::jsonb, synced_at timestamptz not null default now(), unique(post_id)
);
create index if not exists social_posts_org_created_idx on public.social_posts(organization_id,created_at desc);
create index if not exists social_schedules_due_idx on public.social_schedules(status,scheduled_for);
create index if not exists social_metrics_org_synced_idx on public.social_metrics(organization_id,synced_at desc);
alter table public.social_accounts enable row level security;alter table public.social_posts enable row level security;alter table public.social_schedules enable row level security;alter table public.social_metrics enable row level security;
create policy "Content roles read social accounts" on public.social_accounts for select to authenticated using(public.current_org_role(organization_id) in('owner','admin','manager','editor'));
create policy "Admins manage social accounts" on public.social_accounts for all to authenticated using(public.current_org_role(organization_id) in('owner','admin')) with check(public.current_org_role(organization_id) in('owner','admin'));
create policy "Content roles manage social posts" on public.social_posts for all to authenticated using(public.current_org_role(organization_id) in('owner','admin','manager','editor')) with check(public.current_org_role(organization_id) in('owner','admin','manager','editor'));
create policy "Content roles manage social schedules" on public.social_schedules for all to authenticated using(public.current_org_role(organization_id) in('owner','admin','manager','editor')) with check(public.current_org_role(organization_id) in('owner','admin','manager','editor'));
create policy "Content roles read social metrics" on public.social_metrics for select to authenticated using(public.current_org_role(organization_id) in('owner','admin','manager','editor'));
