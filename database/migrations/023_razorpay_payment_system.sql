create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  razorpay_payment_id text unique,
  razorpay_order_id text not null unique,
  amount integer not null check (amount >= 0),
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  credits_added integer not null default 0 check (credits_added >= 0),
  created_at timestamptz not null default now()
);

create index if not exists payment_transactions_user_created_at_idx
  on public.payment_transactions (user_id, created_at desc);

alter table public.payment_transactions enable row level security;

drop policy if exists "Users can read their payment transactions" on public.payment_transactions;
create policy "Users can read their payment transactions"
  on public.payment_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.credit_transactions
  drop constraint if exists credit_transactions_credits_used_check;

alter table public.credit_transactions
  add constraint credit_transactions_credit_amount_check
  check (credits_used >= 0 and credits_added >= 0 and (credits_used > 0 or credits_added > 0));

alter table public.subscriptions
  drop constraint if exists subscriptions_plan_name_check;

alter table public.subscriptions
  add constraint subscriptions_plan_name_check
  check (plan_name in ('free', 'pro', 'creator', 'agency'));

alter table public.creator_usage
  drop constraint if exists creator_usage_subscription_tier_check;

alter table public.creator_usage
  add constraint creator_usage_subscription_tier_check
  check (subscription_tier in ('free', 'creator', 'pro', 'studio', 'agency'));

create or replace function public.record_pending_razorpay_order(
  order_id text,
  order_amount integer,
  order_credits integer
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

  if order_id is null or length(order_id) = 0 then
    raise exception 'Razorpay order id is required';
  end if;

  if order_amount <= 0 or order_credits <= 0 then
    raise exception 'Payment amount and credits must be positive';
  end if;

  insert into public.payment_transactions (
    user_id,
    razorpay_order_id,
    amount,
    status,
    credits_added
  )
  values (
    current_user_id,
    order_id,
    order_amount,
    'created',
    order_credits
  )
  on conflict (razorpay_order_id) do update
    set amount = excluded.amount,
        credits_added = excluded.credits_added,
        status = case
          when public.payment_transactions.status = 'paid' then public.payment_transactions.status
          else 'created'
        end
    where public.payment_transactions.user_id = current_user_id;
end;
$$;

create or replace function public.mark_razorpay_payment_failed(order_id text)
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

  update public.payment_transactions
    set status = 'failed'
    where user_id = current_user_id
      and razorpay_order_id = order_id
      and status <> 'paid';
end;
$$;

create or replace function public.fulfill_razorpay_payment(
  payment_id text,
  order_id text,
  payment_amount integer,
  purchased_plan text,
  purchased_credits integer
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  stored_transaction public.payment_transactions%rowtype;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if payment_id is null or length(payment_id) = 0 then
    raise exception 'Razorpay payment id is required';
  end if;

  if purchased_plan not in ('pro', 'creator', 'agency') then
    raise exception 'Invalid paid plan';
  end if;

  if payment_amount <= 0 or purchased_credits <= 0 then
    raise exception 'Payment amount and credits must be positive';
  end if;

  select *
    into stored_transaction
    from public.payment_transactions
    where user_id = current_user_id
      and razorpay_order_id = order_id
    for update;

  if stored_transaction.id is null then
    raise exception 'Payment transaction not found';
  end if;

  if stored_transaction.amount <> payment_amount or stored_transaction.credits_added <> purchased_credits then
    raise exception 'Payment transaction does not match order';
  end if;

  if stored_transaction.status = 'paid' then
    if stored_transaction.razorpay_payment_id = payment_id then
      return;
    end if;

    raise exception 'Payment transaction already fulfilled';
  end if;

  insert into public.creator_usage (user_id, credits, generations_count, subscription_tier)
  values (current_user_id, 20, 0, 'free')
  on conflict (user_id) do nothing;

  update public.payment_transactions
    set razorpay_payment_id = payment_id,
        status = 'paid'
    where id = stored_transaction.id;

  update public.creator_usage
    set credits = credits + purchased_credits,
        subscription_tier = purchased_plan,
        updated_at = timezone('utc', now())
    where user_id = current_user_id;

  update public.subscriptions
    set status = 'expired',
        end_date = coalesce(end_date, now())
    where user_id = current_user_id
      and status = 'active';

  insert into public.subscriptions (
    user_id,
    plan_name,
    status,
    credits_total,
    credits_remaining,
    start_date
  )
  values (
    current_user_id,
    purchased_plan,
    'active',
    purchased_credits,
    purchased_credits,
    now()
  );

  insert into public.credit_transactions (
    user_id,
    action,
    credits_used,
    credits_added,
    source,
    status
  )
  values (
    current_user_id,
    'credit_purchase',
    0,
    purchased_credits,
    'razorpay',
    'added'
  );
end;
$$;

revoke all on function public.record_pending_razorpay_order(text, integer, integer) from public;
grant execute on function public.record_pending_razorpay_order(text, integer, integer) to authenticated;

revoke all on function public.mark_razorpay_payment_failed(text) from public;
grant execute on function public.mark_razorpay_payment_failed(text) to authenticated;

revoke all on function public.fulfill_razorpay_payment(text, text, integer, text, integer) from public;
grant execute on function public.fulfill_razorpay_payment(text, text, integer, text, integer) to authenticated;
