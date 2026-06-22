create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.client_projects(id) on delete cascade,
  sender_type text not null,
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now(),
  constraint project_messages_sender_type_check
    check (sender_type in ('agency', 'client'))
);

create index if not exists project_messages_org_idx
  on public.project_messages(organization_id, created_at desc);

create index if not exists project_messages_project_idx
  on public.project_messages(project_id, created_at desc);
