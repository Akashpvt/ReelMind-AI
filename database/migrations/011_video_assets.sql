create table if not exists public.video_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.reel_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null default 'placeholder',
  video_url text,
  thumbnail_url text,
  resolution text not null default '720p',
  aspect_ratio text not null default '9:16',
  quality text not null default 'fast',
  duration_seconds integer not null default 10,
  generation_ms integer,
  status text not null default 'placeholder',
  error_message text,
  created_at timestamp with time zone default now(),
  constraint video_assets_provider_check check (provider in ('veo', 'kling', 'runway', 'luma', 'pika', 'placeholder')),
  constraint video_assets_status_check check (status in ('queued', 'generating', 'completed', 'failed', 'placeholder', 'not_configured')),
  constraint video_assets_duration_check check (duration_seconds in (5, 10, 15, 30))
);

create index if not exists video_assets_project_created_at_idx
  on public.video_assets (project_id, created_at desc);

create index if not exists video_assets_user_created_at_idx
  on public.video_assets (user_id, created_at desc);

alter table public.video_assets enable row level security;

drop policy if exists "Users can read their video assets" on public.video_assets;
create policy "Users can read their video assets"
  on public.video_assets for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their video assets" on public.video_assets;
create policy "Users can create their video assets"
  on public.video_assets for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their video assets" on public.video_assets;
create policy "Users can delete their video assets"
  on public.video_assets for delete to authenticated
  using (auth.uid() = user_id);

alter table public.creator_usage
  add column if not exists video_generations bigint not null default 0,
  add column if not exists video_credits_used bigint not null default 0;

create or replace function public.increment_creator_usage(metric text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.creator_usage (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  if metric = 'generation' then
    update public.creator_usage
    set generations_count = generations_count + 1,
        credits = greatest(credits - 1, 0),
        updated_at = timezone('utc', now())
    where user_id = auth.uid();
  elsif metric = 'image_generation' then
    update public.creator_usage
    set image_generations = image_generations + 1,
        updated_at = timezone('utc', now())
    where user_id = auth.uid();
  elsif metric = 'voice_generation' then
    update public.creator_usage
    set voice_generations = voice_generations + 1,
        voice_credits = greatest(voice_credits - 1, 0),
        updated_at = timezone('utc', now())
    where user_id = auth.uid();
  elsif metric = 'video_generation' then
    update public.creator_usage
    set video_generations = video_generations + 1,
        video_credits_used = video_credits_used + 5,
        credits = greatest(credits - 5, 0),
        updated_at = timezone('utc', now())
    where user_id = auth.uid();
  elsif metric = 'export' then
    update public.creator_usage
    set export_count = export_count + 1,
        updated_at = timezone('utc', now())
    where user_id = auth.uid();
  end if;
end;
$$;

revoke all on function public.increment_creator_usage(text) from public;
grant execute on function public.increment_creator_usage(text) to authenticated;
