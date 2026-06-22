create table if not exists public.client_project_access (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.client_projects(id) on delete cascade,
  client_email text not null,
  access_token text not null unique,
  status text not null default 'active',
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint client_project_access_status_check
    check (status in ('active', 'revoked', 'expired'))
);

create unique index if not exists client_project_access_project_email_key
  on public.client_project_access(project_id, client_email);

create index if not exists client_project_access_project_idx
  on public.client_project_access(project_id);

create index if not exists client_project_access_org_idx
  on public.client_project_access(organization_id);

create index if not exists client_project_access_email_idx
  on public.client_project_access(client_email);

create index if not exists client_project_access_token_idx
  on public.client_project_access(access_token);
