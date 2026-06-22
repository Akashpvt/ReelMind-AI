create table if not exists public.creator_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete set null,
  category text not null,
  title text not null,
  content text not null,
  niche text,
  pattern text,
  score numeric not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.winning_hooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete set null,
  hook text not null,
  niche text,
  pattern text,
  views integer not null default 0,
  ctr numeric not null default 0,
  retention numeric not null default 0,
  engagement numeric not null default 0,
  conversion numeric not null default 0,
  score numeric not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.winning_titles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete set null,
  title text not null,
  niche text,
  pattern text,
  views integer not null default 0,
  ctr numeric not null default 0,
  retention numeric not null default 0,
  engagement numeric not null default 0,
  conversion numeric not null default 0,
  score numeric not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.winning_thumbnails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete set null,
  thumbnail_url text,
  thumbnail_prompt text,
  niche text,
  pattern text,
  views integer not null default 0,
  ctr numeric not null default 0,
  retention numeric not null default 0,
  engagement numeric not null default 0,
  conversion numeric not null default 0,
  score numeric not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.audience_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  niche text,
  audience_name text not null,
  demographics jsonb not null default '{}'::jsonb,
  pain_points text[] not null default '{}'::text[],
  desired_outcomes text[] not null default '{}'::text[],
  content_preferences jsonb not null default '{}'::jsonb,
  signal_strength numeric not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  platform text,
  views integer not null default 0,
  ctr numeric not null default 0,
  retention numeric not null default 0,
  engagement numeric not null default 0,
  conversion numeric not null default 0,
  score numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists creator_memories_user_category_score_idx
  on public.creator_memories (user_id, category, score desc);

create index if not exists creator_memories_user_niche_score_idx
  on public.creator_memories (user_id, niche, score desc);

create index if not exists winning_hooks_user_score_idx
  on public.winning_hooks (user_id, score desc);

create index if not exists winning_titles_user_score_idx
  on public.winning_titles (user_id, score desc);

create index if not exists winning_thumbnails_user_score_idx
  on public.winning_thumbnails (user_id, score desc);

create index if not exists audience_profiles_user_niche_idx
  on public.audience_profiles (user_id, niche);

create index if not exists performance_snapshots_user_project_idx
  on public.performance_snapshots (user_id, project_id, captured_at desc);

alter table public.creator_memories enable row level security;
alter table public.winning_hooks enable row level security;
alter table public.winning_titles enable row level security;
alter table public.winning_thumbnails enable row level security;
alter table public.audience_profiles enable row level security;
alter table public.performance_snapshots enable row level security;

drop policy if exists "Users can manage their creator memories" on public.creator_memories;
create policy "Users can manage their creator memories"
  on public.creator_memories for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their winning hooks" on public.winning_hooks;
create policy "Users can manage their winning hooks"
  on public.winning_hooks for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their winning titles" on public.winning_titles;
create policy "Users can manage their winning titles"
  on public.winning_titles for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their winning thumbnails" on public.winning_thumbnails;
create policy "Users can manage their winning thumbnails"
  on public.winning_thumbnails for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their audience profiles" on public.audience_profiles;
create policy "Users can manage their audience profiles"
  on public.audience_profiles for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their performance snapshots" on public.performance_snapshots;
create policy "Users can manage their performance snapshots"
  on public.performance_snapshots for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
