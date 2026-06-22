create table if not exists public.trend_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  niche text not null,
  keyword text not null,
  growth numeric not null default 0,
  competition numeric not null default 0,
  opportunity numeric not null default 0,
  confidence numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.competitor_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  creator text not null,
  niche text not null,
  avg_views bigint not null default 0,
  posting_frequency text,
  hook_patterns text[] not null default '{}'::text[],
  thumbnail_patterns text[] not null default '{}'::text[],
  cta_patterns text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.viral_patterns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  category text not null,
  pattern text not null,
  score numeric not null default 0,
  examples text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.content_gaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  topic text not null,
  demand numeric not null default 0,
  competition numeric not null default 0,
  opportunity numeric not null default 0,
  recommendation text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists trend_reports_user_created_at_idx on public.trend_reports (user_id, created_at desc);
create index if not exists competitor_reports_user_created_at_idx on public.competitor_reports (user_id, created_at desc);
create index if not exists viral_patterns_user_created_at_idx on public.viral_patterns (user_id, created_at desc);
create index if not exists content_gaps_user_created_at_idx on public.content_gaps (user_id, created_at desc);

alter table public.trend_reports enable row level security;
alter table public.competitor_reports enable row level security;
alter table public.viral_patterns enable row level security;
alter table public.content_gaps enable row level security;

drop policy if exists "Users can manage their trend reports" on public.trend_reports;
create policy "Users can manage their trend reports"
  on public.trend_reports for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their competitor reports" on public.competitor_reports;
create policy "Users can manage their competitor reports"
  on public.competitor_reports for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their viral patterns" on public.viral_patterns;
create policy "Users can manage their viral patterns"
  on public.viral_patterns for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their content gaps" on public.content_gaps;
create policy "Users can manage their content gaps"
  on public.content_gaps for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
