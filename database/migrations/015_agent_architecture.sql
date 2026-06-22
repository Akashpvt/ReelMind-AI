create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  agent_type text,
  task_type text,
  status text not null default 'queued',
  input jsonb,
  output jsonb,
  dependencies text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.agent_tasks
  add column if not exists agent_type text,
  add column if not exists input jsonb,
  add column if not exists output jsonb;

create table if not exists public.agent_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  agent_task_id uuid,
  agent_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create index if not exists agent_tasks_user_status_created_at_idx
  on public.agent_tasks (user_id, status, created_at desc);

create index if not exists agent_tasks_project_created_at_arch_idx
  on public.agent_tasks (project_id, created_at desc);

create index if not exists agent_logs_user_created_at_idx
  on public.agent_logs (user_id, created_at desc);

create index if not exists agent_logs_task_created_at_idx
  on public.agent_logs (agent_task_id, created_at desc);

alter table public.agent_tasks enable row level security;
alter table public.agent_logs enable row level security;

drop policy if exists "Users can manage their multi-agent tasks" on public.agent_tasks;
create policy "Users can manage their multi-agent tasks"
  on public.agent_tasks for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage their agent logs" on public.agent_logs;
create policy "Users can manage their agent logs"
  on public.agent_logs for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
