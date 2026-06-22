create table if not exists public.content_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  title text,
  hook text,
  thumbnail_url text,
  cta text,
  views bigint not null default 0,
  ctr numeric not null default 0,
  retention numeric not null default 0,
  engagement numeric not null default 0,
  status text not null default 'learning',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint content_performance_status_check check (status in ('learning', 'winning', 'needs_iteration'))
);

create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  event_type text not null,
  detail text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists content_performance_user_created_at_idx
  on public.content_performance (user_id, created_at desc);

create index if not exists content_performance_project_idx
  on public.content_performance (project_id);

create index if not exists learning_events_user_created_at_idx
  on public.learning_events (user_id, created_at desc);

create index if not exists learning_events_project_created_at_idx
  on public.learning_events (project_id, created_at desc);

alter table public.content_performance enable row level security;
alter table public.learning_events enable row level security;

drop policy if exists "Users can manage their content performance" on public.content_performance;
create policy "Users can manage their content performance"
  on public.content_performance for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their learning events" on public.learning_events;
create policy "Users can manage their learning events"
  on public.learning_events for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
