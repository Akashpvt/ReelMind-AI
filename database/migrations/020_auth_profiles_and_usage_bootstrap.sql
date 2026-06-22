create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.ensure_auth_profile_and_usage(
  profile_email text default null,
  profile_full_name text default null,
  profile_avatar_url text default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.profiles (id, email, full_name, avatar_url)
  values (current_user_id, profile_email, profile_full_name, profile_avatar_url)
  on conflict (id) do update
    set email = coalesce(excluded.email, public.profiles.email),
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  insert into public.creator_usage (user_id, credits, generations_count, subscription_tier)
  values (current_user_id, 20, 0, 'free')
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.ensure_auth_profile_and_usage(text, text, text) from public;
grant execute on function public.ensure_auth_profile_and_usage(text, text, text) to authenticated;

create or replace function public.create_profile_and_usage_for_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.creator_usage (user_id, credits, generations_count, subscription_tier)
  values (new.id, 20, 0, 'free')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists create_profile_and_usage_after_signup on auth.users;
create trigger create_profile_and_usage_after_signup
  after insert on auth.users
  for each row
  execute function public.create_profile_and_usage_for_new_user();
