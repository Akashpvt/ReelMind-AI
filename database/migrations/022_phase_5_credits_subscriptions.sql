create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_name text not null default 'free' check (plan_name in ('free', 'pro', 'agency')),
  status text not null default 'active' check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  credits_total integer not null default 20 check (credits_total >= 0),
  credits_remaining integer not null default 20 check (credits_remaining >= 0),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_user_created_at_idx
  on public.subscriptions (user_id, created_at desc);

create unique index if not exists subscriptions_one_active_per_user_idx
  on public.subscriptions (user_id)
  where status = 'active';

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their subscriptions" on public.subscriptions;
create policy "Users can read their subscriptions"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.credit_transactions
  add column if not exists credits_added integer not null default 0 check (credits_added >= 0),
  add column if not exists source text not null default 'generation',
  add column if not exists status text not null default 'completed' check (status in ('completed', 'failed', 'refunded', 'added'));

create table if not exists public.usage_analytics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tool_name text not null,
  credits_consumed integer not null default 0 check (credits_consumed >= 0),
  created_at timestamptz not null default now()
);

create index if not exists usage_analytics_user_created_at_idx
  on public.usage_analytics (user_id, created_at desc);

create index if not exists usage_analytics_user_tool_idx
  on public.usage_analytics (user_id, tool_name);

alter table public.usage_analytics enable row level security;

drop policy if exists "Users can read their usage analytics" on public.usage_analytics;
create policy "Users can read their usage analytics"
  on public.usage_analytics for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.creator_usage
  drop constraint if exists creator_usage_subscription_tier_check;

alter table public.creator_usage
  add constraint creator_usage_subscription_tier_check
  check (subscription_tier in ('free', 'creator', 'pro', 'studio', 'agency'));

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

  insert into public.subscriptions (user_id, plan_name, status, credits_total, credits_remaining)
  values (current_user_id, 'free', 'active', 20, 20)
  on conflict do nothing;
end;
$$;

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

  insert into public.subscriptions (user_id, plan_name, status, credits_total, credits_remaining)
  values (new.id, 'free', 'active', 20, 20);

  return new;
end;
$$;

create or replace function public.consume_creator_credits(
  credit_action text,
  credit_amount integer
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_credits integer;
  active_subscription_id uuid;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if credit_amount <= 0 then
    raise exception 'Credit amount must be positive';
  end if;

  insert into public.creator_usage (user_id, credits, generations_count, subscription_tier)
  values (current_user_id, 20, 0, 'free')
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, plan_name, status, credits_total, credits_remaining)
  values (current_user_id, 'free', 'active', 20, 20)
  on conflict do nothing;

  select credits
    into current_credits
    from public.creator_usage
    where user_id = current_user_id
    for update;

  if current_credits < credit_amount then
    raise exception 'Insufficient credits';
  end if;

  select id
    into active_subscription_id
    from public.subscriptions
    where user_id = current_user_id and status = 'active'
    order by created_at desc
    limit 1
    for update;

  update public.creator_usage
    set credits = credits - credit_amount,
        generations_count = generations_count + 1,
        image_generations = case when credit_action = 'thumbnail' then image_generations + 1 else image_generations end,
        voice_generations = case when credit_action = 'voiceover' then voice_generations + 1 else voice_generations end,
        video_generations = case when credit_action = 'video_generation' then video_generations + 1 else video_generations end,
        video_credits_used = case when credit_action = 'video_generation' then video_credits_used + credit_amount else video_credits_used end,
        updated_at = timezone('utc', now())
    where user_id = current_user_id;

  if active_subscription_id is not null then
    update public.subscriptions
      set credits_remaining = greatest(credits_remaining - credit_amount, 0)
      where id = active_subscription_id;
  end if;

  insert into public.credit_transactions (user_id, action, credits_used, credits_added, source, status)
  values (current_user_id, credit_action, credit_amount, 0, 'generation', 'completed');

  insert into public.usage_analytics (user_id, tool_name, credits_consumed)
  values (current_user_id, credit_action, credit_amount);
end;
$$;

revoke all on function public.consume_creator_credits(text, integer) from public;
grant execute on function public.consume_creator_credits(text, integer) to authenticated;
