-- Phase 24: security telemetry, rate-limit accounting, cron and queue monitoring.
create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  severity text not null default 'info',
  source text not null default 'application',
  route text,
  method text,
  request_id text,
  ip_hash text,
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  fingerprint text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint security_events_type_check check (event_type in ('error','failed_job','rate_limit','abuse_attempt','bot_blocked','api_rejected','health_degraded','cron_failed')),
  constraint security_events_severity_check check (severity in ('info','warning','error','critical'))
);

create table if not exists public.rate_limit_buckets (
  bucket_key text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  request_limit integer not null,
  last_request_at timestamptz not null default now(),
  primary key (bucket_key, window_started_at)
);

create table if not exists public.cron_monitors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  expected_interval_minutes integer not null,
  status text not null default 'never_run',
  last_started_at timestamptz,
  last_completed_at timestamptz,
  last_duration_ms integer,
  last_error text,
  consecutive_failures integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint cron_monitors_status_check check (status in ('never_run','running','healthy','failed'))
);

create table if not exists public.queue_snapshots (
  id uuid primary key default gen_random_uuid(),
  queue_name text not null,
  pending_count integer not null default 0,
  processing_count integer not null default 0,
  failed_count integer not null default 0,
  oldest_pending_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists security_events_type_created_idx on public.security_events(event_type,created_at desc);
create index if not exists security_events_severity_created_idx on public.security_events(severity,created_at desc);
create index if not exists rate_limit_buckets_last_idx on public.rate_limit_buckets(last_request_at);
create index if not exists queue_snapshots_name_captured_idx on public.queue_snapshots(queue_name,captured_at desc);

insert into public.cron_monitors(name,expected_interval_minutes) values
  ('social-publishing',5),('whatsapp-overdue-invoices',60)
on conflict(name) do update set expected_interval_minutes=excluded.expected_interval_minutes;

alter table public.security_events enable row level security;
alter table public.rate_limit_buckets enable row level security;
alter table public.cron_monitors enable row level security;
alter table public.queue_snapshots enable row level security;
create policy "Platform admins read security events" on public.security_events for select to authenticated using(public.is_platform_admin());
create policy "Platform admins update security events" on public.security_events for update to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy "Platform admins read rate limits" on public.rate_limit_buckets for select to authenticated using(public.is_platform_admin());
create policy "Platform admins read cron monitors" on public.cron_monitors for select to authenticated using(public.is_platform_admin());
create policy "Platform admins read queue snapshots" on public.queue_snapshots for select to authenticated using(public.is_platform_admin());

create or replace function public.consume_rate_limit(rate_key text, window_seconds integer, max_requests integer)
returns table(allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare window_start timestamptz; current_count integer;
begin
  window_start := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  insert into public.rate_limit_buckets(bucket_key,window_started_at,request_count,request_limit,last_request_at)
  values(rate_key,window_start,1,max_requests,now())
  on conflict(bucket_key,window_started_at) do update set request_count=public.rate_limit_buckets.request_count+1,request_limit=max_requests,last_request_at=now()
  returning request_count into current_count;
  return query select current_count <= max_requests, greatest(max_requests-current_count,0), window_start + make_interval(secs=>window_seconds);
end $$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create or replace function public.cleanup_security_telemetry()
returns void language plpgsql security definer set search_path='' as $$
begin
  delete from public.rate_limit_buckets where last_request_at < now()-interval '24 hours';
  delete from public.queue_snapshots where captured_at < now()-interval '30 days';
  delete from public.security_events where created_at < now()-interval '180 days' and severity in ('info','warning');
end $$;
