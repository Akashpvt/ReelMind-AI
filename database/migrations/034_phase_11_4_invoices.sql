create table if not exists public.project_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.client_projects(id) on delete cascade,
  invoice_number text unique,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  issued_at timestamptz not null default now(),
  paid_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint project_invoices_status_check
    check (status in ('pending', 'partially_paid', 'paid', 'cancelled'))
);

create index if not exists project_invoices_org_idx
  on public.project_invoices(organization_id, created_at desc);

create index if not exists project_invoices_project_idx
  on public.project_invoices(project_id, created_at desc);

create index if not exists project_invoices_status_idx
  on public.project_invoices(organization_id, status);
