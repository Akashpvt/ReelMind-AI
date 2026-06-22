-- Phase 22: AI Content Generation Engine
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  generation_type text not null,
  provider text not null default 'local',
  model text,
  prompt text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  status text not null default 'completed',
  error_message text,
  created_at timestamptz not null default now(),
  constraint ai_generations_type_check check (generation_type in ('script','hook','caption','hashtags','thumbnail_concepts','brand_analysis','content_calendar','strategy_report')),
  constraint ai_generations_provider_check check (provider in ('openai','gemini','claude','local')),
  constraint ai_generations_status_check check (status in ('completed','failed'))
);

create table if not exists public.content_calendars (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_id uuid references public.ai_generations(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  client_name text,
  start_date date not null,
  end_date date not null,
  platforms text[] not null default '{}',
  entries jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_calendars_status_check check (status in ('draft','active','archived'))
);

create table if not exists public.strategy_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  generation_id uuid references public.ai_generations(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  report_type text not null,
  title text not null,
  client_name text,
  executive_summary text,
  content jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint strategy_reports_type_check check (report_type in ('brand_analysis','client_strategy')),
  constraint strategy_reports_status_check check (status in ('draft','final','archived'))
);

create index if not exists ai_generations_org_created_idx on public.ai_generations(organization_id,created_at desc);
create index if not exists content_calendars_org_created_idx on public.content_calendars(organization_id,created_at desc);
create index if not exists strategy_reports_org_created_idx on public.strategy_reports(organization_id,created_at desc);

alter table public.ai_generations enable row level security;
alter table public.content_calendars enable row level security;
alter table public.strategy_reports enable row level security;

create policy "Content roles manage AI generations" on public.ai_generations for all to authenticated
  using (public.current_org_role(organization_id) in ('owner','admin','manager','editor'))
  with check (public.current_org_role(organization_id) in ('owner','admin','manager','editor'));
create policy "Content roles manage calendars" on public.content_calendars for all to authenticated
  using (public.current_org_role(organization_id) in ('owner','admin','manager','editor'))
  with check (public.current_org_role(organization_id) in ('owner','admin','manager','editor'));
create policy "Content roles manage strategy reports" on public.strategy_reports for all to authenticated
  using (public.current_org_role(organization_id) in ('owner','admin','manager','editor'))
  with check (public.current_org_role(organization_id) in ('owner','admin','manager','editor'));
