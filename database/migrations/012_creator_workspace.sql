create table if not exists public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  title text not null,
  platform text not null default 'Instagram',
  publish_date date,
  status text not null default 'Idea',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint content_calendar_status_check check (status in ('Idea', 'Draft', 'Generated', 'Scheduled', 'Published'))
);

create table if not exists public.content_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  category text not null,
  title text not null,
  asset_url text,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint content_library_category_check check (category in ('Scripts', 'Storyboards', 'Voiceovers', 'Thumbnails', 'Videos'))
);

create table if not exists public.content_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  hook integer not null default 0,
  retention integer not null default 0,
  visual_strength integer not null default 0,
  cta_quality integer not null default 0,
  overall integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  constraint content_scores_range_check check (
    hook between 0 and 100 and
    retention between 0 and 100 and
    visual_strength between 0 and 100 and
    cta_quality between 0 and 100 and
    overall between 0 and 100
  )
);

create index if not exists content_calendar_user_publish_date_idx
  on public.content_calendar (user_id, publish_date);

create index if not exists content_calendar_project_idx
  on public.content_calendar (project_id);

create index if not exists content_library_user_category_idx
  on public.content_library (user_id, category, created_at desc);

create index if not exists content_library_project_idx
  on public.content_library (project_id);

create index if not exists content_scores_project_created_at_idx
  on public.content_scores (project_id, created_at desc);

alter table public.content_calendar enable row level security;
alter table public.content_library enable row level security;
alter table public.content_scores enable row level security;

drop policy if exists "Users can read their content calendar" on public.content_calendar;
create policy "Users can read their content calendar"
  on public.content_calendar for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their content calendar" on public.content_calendar;
create policy "Users can manage their content calendar"
  on public.content_calendar for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their content library" on public.content_library;
create policy "Users can read their content library"
  on public.content_library for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their content library" on public.content_library;
create policy "Users can manage their content library"
  on public.content_library for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their content scores" on public.content_scores;
create policy "Users can read their content scores"
  on public.content_scores for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their content scores" on public.content_scores;
create policy "Users can manage their content scores"
  on public.content_scores for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
