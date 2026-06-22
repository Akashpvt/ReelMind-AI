create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  trigger_config jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  status text not null default 'paused',
  is_template boolean not null default false,
  template_key text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflows_status_check check (status in ('active','paused','archived')),
  constraint workflows_trigger_check check (trigger_type in ('project_created','project_assigned','status_changed','client_approved','invoice_paid','lead_created','lead_converted','file_uploaded')),
  constraint workflows_actions_array_check check (jsonb_typeof(actions) = 'array')
);

create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trigger_type text not null,
  trigger_payload jsonb not null default '{}'::jsonb,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text,
  constraint workflow_runs_status_check check (status in ('running','success','failed','skipped'))
);

create table if not exists public.workflow_logs (
  id uuid primary key default gen_random_uuid(),
  workflow_run_id uuid not null references public.workflow_runs(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action_type text not null,
  action_index integer not null default 0,
  status text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint workflow_logs_status_check check (status in ('success','failed','skipped'))
);

create table if not exists public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.client_projects(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open','in_progress','completed','cancelled')),
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists workflows_org_status_trigger_idx on public.workflows(organization_id,status,trigger_type);
create index if not exists workflow_runs_org_created_idx on public.workflow_runs(organization_id,started_at desc);
create index if not exists workflow_logs_run_idx on public.workflow_logs(workflow_run_id,action_index);
create index if not exists workflow_tasks_org_status_idx on public.workflow_tasks(organization_id,status,created_at desc);

alter table public.workflows enable row level security;
alter table public.workflow_runs enable row level security;
alter table public.workflow_logs enable row level security;
alter table public.workflow_tasks enable row level security;

create policy "Members can read workflows" on public.workflows for select to authenticated using (public.current_org_role(organization_id) is not null);
create policy "Project managers can manage workflows" on public.workflows for all to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager')) with check (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Members can read workflow runs" on public.workflow_runs for select to authenticated using (public.current_org_role(organization_id) is not null);
create policy "Members can read workflow logs" on public.workflow_logs for select to authenticated using (public.current_org_role(organization_id) is not null);
create policy "Members can read workflow tasks" on public.workflow_tasks for select to authenticated using (public.current_org_role(organization_id) is not null);
create policy "Editors can update workflow tasks" on public.workflow_tasks for update to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager','editor')) with check (public.current_org_role(organization_id) in ('owner','admin','manager','editor'));
