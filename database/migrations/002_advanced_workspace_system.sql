alter table public.reel_projects
  add column if not exists category text,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists generation_model text not null default 'gemini-2.5-flash',
  add column if not exists status text not null default 'generated';

update public.reel_projects
set category = niche
where category is null;

alter table public.reel_projects
  alter column category set not null;

alter table public.reel_projects
  drop constraint if exists reel_projects_status_check;

alter table public.reel_projects
  add constraint reel_projects_status_check
  check (status in ('draft', 'generated', 'archived'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reel_projects_set_updated_at on public.reel_projects;
create trigger reel_projects_set_updated_at
  before update on public.reel_projects
  for each row
  execute function public.set_updated_at();

create index if not exists reel_projects_user_updated_at_idx
  on public.reel_projects (user_id, updated_at desc);

drop policy if exists "Users can update their reel projects" on public.reel_projects;
create policy "Users can update their reel projects"
  on public.reel_projects
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.creator_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  credits integer not null default 20 check (credits >= 0),
  generations_count bigint not null default 0 check (generations_count >= 0),
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'creator', 'pro', 'studio')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.creator_usage enable row level security;

drop trigger if exists creator_usage_set_updated_at on public.creator_usage;
create trigger creator_usage_set_updated_at
  before update on public.creator_usage
  for each row
  execute function public.set_updated_at();

drop policy if exists "Users can read their usage" on public.creator_usage;
create policy "Users can read their usage"
  on public.creator_usage
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.create_usage_for_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.creator_usage (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists create_usage_after_signup on auth.users;
create trigger create_usage_after_signup
  after insert on auth.users
  for each row
  execute function public.create_usage_for_new_user();

insert into public.creator_usage (user_id)
select id from auth.users
on conflict (user_id) do nothing;
