create table if not exists public.agent_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete cascade,
  task_type text not null,
  status text not null default 'queued',
  dependencies text[] not null default '{}'::text[],
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint agent_tasks_status_check check (status in ('queued', 'processing', 'completed', 'failed')),
  constraint agent_tasks_type_check check (task_type in ('script', 'storyboard', 'thumbnail', 'voice', 'video'))
);

create index if not exists agent_tasks_project_created_at_idx
  on public.agent_tasks (project_id, created_at desc);

create index if not exists agent_tasks_user_status_idx
  on public.agent_tasks (user_id, status, created_at desc);

alter table public.agent_tasks enable row level security;

drop policy if exists "Users can manage their agent tasks" on public.agent_tasks;
create policy "Users can manage their agent tasks"
  on public.agent_tasks for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
