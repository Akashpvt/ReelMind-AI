create table if not exists public.mobile_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null,
  device_name text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mobile_push_tokens_platform_check check (platform in ('ios','android'))
);
create index if not exists mobile_push_tokens_user_idx on public.mobile_push_tokens(user_id,enabled);
alter table public.mobile_push_tokens enable row level security;
create policy "Users manage own push tokens" on public.mobile_push_tokens for all to authenticated
  using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
