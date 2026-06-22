create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_name text not null default 'free',
  status text not null default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  current_period_start timestamptz default now(),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  razorpay_order_id text,
  razorpay_payment_id text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_subscriptions_plan_check
    check (plan_name in ('free', 'starter', 'pro', 'agency')),
  constraint organization_subscriptions_status_check
    check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired'))
);

alter table public.payment_transactions
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists plan_id text,
  add column if not exists billing_kind text default 'credits';

create index if not exists organization_subscriptions_org_idx
  on public.organization_subscriptions(organization_id, status);

create index if not exists payment_transactions_org_created_at_idx
  on public.payment_transactions(organization_id, created_at desc);

alter table public.organization_subscriptions enable row level security;

drop policy if exists "Members can read organization subscriptions" on public.organization_subscriptions;
create policy "Members can read organization subscriptions"
  on public.organization_subscriptions for select to authenticated
  using (public.current_org_role(organization_id) is not null);

drop policy if exists "Owners can manage organization subscriptions" on public.organization_subscriptions;
create policy "Owners can manage organization subscriptions"
  on public.organization_subscriptions for all to authenticated
  using (public.current_org_role(organization_id) in ('owner', 'admin'))
  with check (public.current_org_role(organization_id) in ('owner', 'admin'));
