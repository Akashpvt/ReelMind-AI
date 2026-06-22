-- Phase 25: immutable production go-live readiness reports.
create table if not exists public.launch_readiness_reports (
  id uuid primary key default gen_random_uuid(),
  score integer not null,
  verdict text not null,
  checks jsonb not null default '[]'::jsonb,
  missing_configuration text[] not null default '{}',
  summary jsonb not null default '{}'::jsonb,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  constraint launch_readiness_score_check check(score between 0 and 100),
  constraint launch_readiness_verdict_check check(verdict in ('production_ready','conditional','blocked'))
);
create index if not exists launch_readiness_reports_generated_idx on public.launch_readiness_reports(generated_at desc);
alter table public.launch_readiness_reports enable row level security;
create policy "Platform admins read launch reports" on public.launch_readiness_reports for select to authenticated using(public.is_platform_admin());
create policy "Platform admins create launch reports" on public.launch_readiness_reports for insert to authenticated with check(generated_by=(select auth.uid()) and public.is_platform_admin());
