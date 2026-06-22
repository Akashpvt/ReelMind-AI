create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  status text not null default 'queued',
  progress integer not null default 0,
  current_agent text,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  started_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.workflow_runs
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists project_id uuid references public.reel_projects(id) on delete cascade,
  add column if not exists status text not null default 'queued',
  add column if not exists progress integer not null default 0,
  add column if not exists current_agent text,
  add column if not exists input jsonb not null default '{}'::jsonb,
  add column if not exists output jsonb not null default '{}'::jsonb,
  add column if not exists started_at timestamp with time zone default now(),
  add column if not exists completed_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone default now();

create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  workflow_run_id uuid references public.workflow_runs(id) on delete cascade,
  agent text,
  agent_type text,
  task_type text,
  status text not null default 'queued',
  input jsonb,
  output jsonb,
  dependencies text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.agent_tasks
  add column if not exists workflow_run_id uuid references public.workflow_runs(id) on delete cascade,
  add column if not exists agent text,
  add column if not exists agent_type text,
  add column if not exists task_type text,
  add column if not exists input jsonb,
  add column if not exists output jsonb,
  add column if not exists dependencies text[] not null default '{}'::text[],
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists started_at timestamp with time zone,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists updated_at timestamp with time zone default now();

create index if not exists workflow_runs_user_status_updated_at_idx
  on public.workflow_runs (user_id, status, updated_at desc);

create index if not exists workflow_runs_project_updated_at_idx
  on public.workflow_runs (project_id, updated_at desc);

create index if not exists agent_tasks_workflow_run_id_idx
  on public.agent_tasks (workflow_run_id);

create index if not exists agent_tasks_user_workflow_status_idx
  on public.agent_tasks (user_id, workflow_run_id, status);

alter table public.workflow_runs enable row level security;
alter table public.agent_tasks enable row level security;

drop policy if exists "Users can manage their autonomous workflow runs" on public.workflow_runs;
create policy "Users can manage their autonomous workflow runs"
  on public.workflow_runs for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their autonomous factory tasks" on public.agent_tasks;
create policy "Users can manage their autonomous factory tasks"
  on public.agent_tasks for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
