create table if not exists public.ai_agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_type text not null,
  name text not null,
  description text,
  status text not null default 'active',
  configuration jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, agent_type),
  constraint ai_agents_type_check check (agent_type in ('project_manager','sales_agent','client_success','content_strategist','workspace_copilot')),
  constraint ai_agents_status_check check (status in ('active','paused'))
);

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete set null,
  project_id uuid references public.client_projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'medium',
  status text not null default 'suggested',
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_tasks_priority_check check (priority in ('low','medium','high','urgent')),
  constraint ai_tasks_status_check check (status in ('suggested','accepted','completed','dismissed'))
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id uuid references public.ai_agents(id) on delete set null,
  project_id uuid references public.client_projects(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  recommendation_type text not null,
  title text not null,
  recommendation text not null,
  score numeric,
  severity text not null default 'info',
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint ai_recommendations_severity_check check (severity in ('info','opportunity','warning','critical')),
  constraint ai_recommendations_status_check check (status in ('open','accepted','dismissed')),
  constraint ai_recommendations_score_check check (score is null or (score >= 0 and score <= 100))
);

create index if not exists ai_agents_org_type_idx on public.ai_agents(organization_id,agent_type);
create index if not exists ai_tasks_org_status_idx on public.ai_tasks(organization_id,status,created_at desc);
create index if not exists ai_recommendations_org_status_idx on public.ai_recommendations(organization_id,status,created_at desc);

alter table public.ai_agents enable row level security;
alter table public.ai_tasks enable row level security;
alter table public.ai_recommendations enable row level security;

create policy "Analytics roles can read AI agents" on public.ai_agents for select to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Analytics roles can manage AI agents" on public.ai_agents for all to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager')) with check (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Analytics roles can read AI tasks" on public.ai_tasks for select to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Analytics roles can update AI tasks" on public.ai_tasks for update to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager')) with check (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Analytics roles can read AI recommendations" on public.ai_recommendations for select to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Analytics roles can update AI recommendations" on public.ai_recommendations for update to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager')) with check (public.current_org_role(organization_id) in ('owner','admin','manager'));
