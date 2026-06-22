create table if not exists public.thumbnail_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.reel_projects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prompt text not null,
  image_url text,
  provider text not null default 'placeholder'
    check (provider in ('gemini', 'pollinations', 'placeholder', 'failed')),
  width integer not null default 1280 check (width > 0),
  height integer not null default 720 check (height > 0),
  created_at timestamptz not null default now(),
  generation_ms integer check (generation_ms is null or generation_ms >= 0),
  status text not null default 'completed'
    check (status in ('queued', 'generating', 'completed', 'failed', 'placeholder')),
  seed integer,
  prompt_hash text,
  error_message text
);

create index if not exists thumbnail_assets_project_created_at_idx
  on public.thumbnail_assets (project_id, created_at desc);

create index if not exists thumbnail_assets_user_created_at_idx
  on public.thumbnail_assets (user_id, created_at desc);

create index if not exists thumbnail_assets_prompt_hash_idx
  on public.thumbnail_assets (prompt_hash);

alter table public.thumbnail_assets enable row level security;

drop policy if exists "Users can read their thumbnail assets" on public.thumbnail_assets;
create policy "Users can read their thumbnail assets"
  on public.thumbnail_assets for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their thumbnail assets" on public.thumbnail_assets;
create policy "Users can create their thumbnail assets"
  on public.thumbnail_assets for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their thumbnail assets" on public.thumbnail_assets;
create policy "Users can delete their thumbnail assets"
  on public.thumbnail_assets for delete to authenticated
  using ((select auth.uid()) = user_id);
