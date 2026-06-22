create extension if not exists pgcrypto;

create table if not exists public.reel_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  niche text not null,
  tone text not null,
  language text not null,
  duration text not null,
  prompt text not null,
  viral_hook text not null,
  reel_script text not null,
  caption text not null,
  cta text not null,
  video_prompt text not null,
  thumbnail_prompt text not null,
  created_at timestamptz not null default now()
);

create index if not exists reel_projects_user_created_at_idx
  on public.reel_projects (user_id, created_at desc);

alter table public.reel_projects enable row level security;

drop policy if exists "Users can read their reel projects" on public.reel_projects;
create policy "Users can read their reel projects"
  on public.reel_projects
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their reel projects" on public.reel_projects;
create policy "Users can create their reel projects"
  on public.reel_projects
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their reel projects" on public.reel_projects;
create policy "Users can delete their reel projects"
  on public.reel_projects
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
