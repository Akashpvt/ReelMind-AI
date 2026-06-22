alter table public.client_projects
  add column if not exists assigned_member_id uuid references auth.users(id) on delete set null,
  add column if not exists assigned_member_name text;

update public.client_projects
set assigned_member_id = coalesce(assigned_member_id, assigned_to)
where assigned_to is not null;

create index if not exists client_projects_assigned_member_idx
  on public.client_projects(assigned_member_id, created_at desc);
