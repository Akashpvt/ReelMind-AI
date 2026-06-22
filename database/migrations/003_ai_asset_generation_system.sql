alter table public.reel_projects
  add column if not exists thumbnail_url text,
  add column if not exists export_count integer not null default 0
    check (export_count >= 0);

alter table public.creator_usage
  add column if not exists export_count bigint not null default 0
    check (export_count >= 0),
  add column if not exists image_generations bigint not null default 0
    check (image_generations >= 0);

create table if not exists public.generation_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.reel_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('generation', 'thumbnail', 'regeneration')),
  snapshot jsonb,
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create index if not exists generation_history_project_created_at_idx
  on public.generation_history (project_id, created_at desc);

alter table public.generation_history enable row level security;

drop policy if exists "Users can read their generation history" on public.generation_history;
create policy "Users can read their generation history"
  on public.generation_history for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their generation history" on public.generation_history;
create policy "Users can create their generation history"
  on public.generation_history for insert to authenticated
  with check ((select auth.uid()) = user_id);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.reel_projects (id) on delete cascade,
  action text not null check (action in ('generated', 'saved', 'exported', 'image_generated', 'renamed')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_user_created_at_idx
  on public.activity_logs (user_id, created_at desc);

alter table public.activity_logs enable row level security;

drop policy if exists "Users can read their activity" on public.activity_logs;
create policy "Users can read their activity"
  on public.activity_logs for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users can create their activity" on public.activity_logs;
create policy "Users can create their activity"
  on public.activity_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('reel-thumbnails', 'reel-thumbnails', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload their thumbnails" on storage.objects;
create policy "Users can upload their thumbnails"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'reel-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their thumbnails" on storage.objects;
create policy "Users can update their thumbnails"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'reel-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'reel-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their thumbnails" on storage.objects;
create policy "Users can delete their thumbnails"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'reel-thumbnails'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.increment_creator_usage(metric text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.creator_usage (user_id)
  values ((select auth.uid()))
  on conflict (user_id) do nothing;

  if metric = 'generation' then
    update public.creator_usage
    set generations_count = generations_count + 1
    where user_id = (select auth.uid());
  elsif metric = 'image_generation' then
    update public.creator_usage
    set image_generations = image_generations + 1
    where user_id = (select auth.uid());
  elsif metric = 'export' then
    update public.creator_usage
    set export_count = export_count + 1
    where user_id = (select auth.uid());
  else
    raise exception 'Unknown usage metric';
  end if;
end;
$$;

revoke all on function public.increment_creator_usage(text) from public;
grant execute on function public.increment_creator_usage(text) to authenticated;
