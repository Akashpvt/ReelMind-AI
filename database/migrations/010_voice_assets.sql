create table if not exists public.voice_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.reel_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null default 'placeholder'
    check (provider in ('elevenlabs', 'cartesia', 'playht', 'placeholder')),
  voice_name text,
  voice_style text,
  language text,
  emotion text,
  pacing text,
  audio_url text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  generation_ms integer check (generation_ms is null or generation_ms >= 0),
  status text not null default 'completed'
    check (status in ('completed', 'failed', 'not_configured', 'quota_limited', 'placeholder')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists voice_assets_project_created_at_idx
  on public.voice_assets (project_id, created_at desc);

create index if not exists voice_assets_user_created_at_idx
  on public.voice_assets (user_id, created_at desc);

alter table public.voice_assets enable row level security;

drop policy if exists "Users can read their voice assets" on public.voice_assets;
create policy "Users can read their voice assets"
  on public.voice_assets for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their voice assets" on public.voice_assets;
create policy "Users can create their voice assets"
  on public.voice_assets for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their voice assets" on public.voice_assets;
create policy "Users can delete their voice assets"
  on public.voice_assets for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('voice-assets', 'voice-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "Users can upload their voice assets" on storage.objects;
create policy "Users can upload their voice assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their voice assets" on storage.objects;
create policy "Users can update their voice assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'voice-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'voice-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their voice assets" on storage.objects;
create policy "Users can delete their voice assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'voice-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

alter table public.creator_usage
  add column if not exists voice_credits integer not null default 10
    check (voice_credits >= 0),
  add column if not exists voice_generations bigint not null default 0
    check (voice_generations >= 0);

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
    set
      generations_count = generations_count + 1,
      credits = greatest(credits - 1, 0)
    where user_id = (select auth.uid());
  elsif metric = 'image_generation' then
    update public.creator_usage
    set image_generations = image_generations + 1
    where user_id = (select auth.uid());
  elsif metric = 'voice_generation' then
    update public.creator_usage
    set
      voice_generations = voice_generations + 1,
      voice_credits = greatest(voice_credits - 1, 0)
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
