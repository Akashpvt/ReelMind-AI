create extension if not exists pgcrypto;

alter table public.organization_invites
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists status text not null default 'pending';

alter table public.organization_invites
  drop constraint if exists organization_invites_status_check;

alter table public.organization_invites
  add constraint organization_invites_status_check
    check (status in ('pending', 'accepted', 'expired', 'revoked'));

alter table public.client_projects
  add column if not exists client_name text,
  add column if not exists client_email text,
  add column if not exists project_title text,
  add column if not exists project_description text,
  add column if not exists priority text not null default 'medium',
  add column if not exists budget numeric not null default 0,
  add column if not exists deadline timestamptz,
  add column if not exists assigned_to uuid references auth.users(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.client_projects
  drop constraint if exists client_projects_status_check,
  drop constraint if exists client_projects_priority_check;

update public.client_projects
set
  client_name = coalesce(client_name, 'Client'),
  project_title = coalesce(project_title, 'Untitled Project'),
  status = case
    when status in ('brief', 'planning', 'scripting', 'production', 'review', 'delivered', 'archived') then status
    when status = 'completed' then 'delivered'
    when status = 'draft' then 'brief'
    else 'brief'
  end,
  priority = coalesce(priority, 'medium'),
  budget = coalesce(budget, 0),
  updated_at = coalesce(updated_at, created_at, now());

alter table public.client_projects
  alter column client_name set not null,
  alter column project_title set not null,
  alter column status set default 'brief',
  alter column priority set default 'medium',
  alter column budget set default 0,
  alter column updated_at set default now();

alter table public.client_projects
  add constraint client_projects_status_check
    check (status in ('brief', 'planning', 'scripting', 'production', 'review', 'delivered', 'archived')),
  add constraint client_projects_priority_check
    check (priority in ('low', 'medium', 'high', 'urgent'));

create table if not exists public.project_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.client_projects(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists client_projects_org_status_idx on public.client_projects(organization_id, status, created_at desc);
create index if not exists client_projects_assigned_to_idx on public.client_projects(assigned_to, created_at desc);
create index if not exists project_activity_logs_project_idx on public.project_activity_logs(project_id, created_at desc);
create index if not exists project_activity_logs_org_idx on public.project_activity_logs(organization_id, created_at desc);

create or replace function public.touch_client_projects_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_client_projects_updated_at on public.client_projects;
create trigger touch_client_projects_updated_at
before update on public.client_projects
for each row
execute function public.touch_client_projects_updated_at();

create or replace function public.can_manage_org_projects(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_org_role(target_organization_id) in ('owner', 'admin', 'manager', 'editor');
$$;

alter table public.client_projects enable row level security;
alter table public.project_activity_logs enable row level security;

drop policy if exists "Members and clients can read projects" on public.client_projects;
create policy "Members and clients can read projects"
  on public.client_projects for select to authenticated
  using (
    public.current_org_role(organization_id) in ('owner', 'admin', 'manager', 'editor', 'creator')
    or assigned_to = auth.uid()
  );

drop policy if exists "Managers can create projects" on public.client_projects;
create policy "Managers can create projects"
  on public.client_projects for insert to authenticated
  with check (
    public.can_manage_org_projects(organization_id)
    and created_by = auth.uid()
  );

drop policy if exists "Managers can update projects" on public.client_projects;
create policy "Managers can update projects"
  on public.client_projects for update to authenticated
  using (public.can_manage_org_projects(organization_id))
  with check (public.can_manage_org_projects(organization_id));

drop policy if exists "Organization members can read project activity" on public.project_activity_logs;
create policy "Organization members can read project activity"
  on public.project_activity_logs for select to authenticated
  using (
    public.current_org_role(organization_id) is not null
    or exists (
      select 1
      from public.client_projects project
      where project.id = project_id
        and project.assigned_to = auth.uid()
    )
  );

drop policy if exists "Organization members can create project activity" on public.project_activity_logs;
create policy "Organization members can create project activity"
  on public.project_activity_logs for insert to authenticated
  with check (public.current_org_role(organization_id) is not null);
