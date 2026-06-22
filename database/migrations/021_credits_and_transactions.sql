create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  credits_used integer not null check (credits_used > 0),
  created_at timestamptz not null default now()
);

create index if not exists credit_transactions_user_created_at_idx
  on public.credit_transactions (user_id, created_at desc);

alter table public.credit_transactions enable row level security;

drop policy if exists "Users can read their credit transactions" on public.credit_transactions;
create policy "Users can read their credit transactions"
  on public.credit_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

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

  select credits
    into current_credits
    from public.creator_usage
    where user_id = current_user_id
    for update;

  if current_credits < credit_amount then
    raise exception 'Insufficient credits';
  end if;

  update public.creator_usage
    set credits = credits - credit_amount,
        generations_count = generations_count + 1,
        image_generations = case when credit_action = 'thumbnail' then image_generations + 1 else image_generations end,
        voice_generations = case when credit_action = 'voiceover' then voice_generations + 1 else voice_generations end,
        video_generations = case when credit_action = 'video_generation' then video_generations + 1 else video_generations end,
        video_credits_used = case when credit_action = 'video_generation' then video_credits_used + credit_amount else video_credits_used end,
        updated_at = timezone('utc', now())
    where user_id = current_user_id;

  insert into public.credit_transactions (user_id, action, credits_used)
  values (current_user_id, credit_action, credit_amount);
end;
$$;

revoke all on function public.consume_creator_credits(text, integer) from public;
grant execute on function public.consume_creator_credits(text, integer) to authenticated;
