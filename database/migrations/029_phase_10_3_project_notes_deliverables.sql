create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.client_projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.client_projects(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists project_notes_project_created_idx
  on public.project_notes(project_id, created_at desc);

create index if not exists project_notes_org_created_idx
  on public.project_notes(organization_id, created_at desc);

create index if not exists project_deliverables_project_created_idx
  on public.project_deliverables(project_id, created_at desc);

create index if not exists project_deliverables_org_created_idx
  on public.project_deliverables(organization_id, created_at desc);
