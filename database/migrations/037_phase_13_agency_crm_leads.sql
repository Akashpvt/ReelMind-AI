create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  source text,
  budget numeric default 0,
  notes text,
  status text not null default 'new',
  converted_project_id uuid references public.client_projects(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_status_check
    check (status in ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'))
);

create table if not exists public.lead_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists leads_org_status_idx
  on public.leads(organization_id, status, created_at desc);

create index if not exists leads_org_created_idx
  on public.leads(organization_id, created_at desc);

create index if not exists lead_activity_logs_lead_idx
  on public.lead_activity_logs(lead_id, created_at desc);

create index if not exists lead_activity_logs_org_idx
  on public.lead_activity_logs(organization_id, created_at desc);

alter table public.leads enable row level security;
alter table public.lead_activity_logs enable row level security;

drop policy if exists "Members can read leads" on public.leads;
create policy "Members can read leads"
  on public.leads for select to authenticated
  using (public.current_org_role(organization_id) is not null);

drop policy if exists "Managers can create leads" on public.leads;
create policy "Managers can create leads"
  on public.leads for insert to authenticated
  with check (public.current_org_role(organization_id) in ('owner', 'admin', 'manager', 'editor'));

drop policy if exists "Managers can update leads" on public.leads;
create policy "Managers can update leads"
  on public.leads for update to authenticated
  using (public.current_org_role(organization_id) in ('owner', 'admin', 'manager', 'editor'))
  with check (public.current_org_role(organization_id) in ('owner', 'admin', 'manager', 'editor'));

drop policy if exists "Members can read lead activity" on public.lead_activity_logs;
create policy "Members can read lead activity"
  on public.lead_activity_logs for select to authenticated
  using (public.current_org_role(organization_id) is not null);

drop policy if exists "Members can create lead activity" on public.lead_activity_logs;
create policy "Members can create lead activity"
  on public.lead_activity_logs for insert to authenticated
  with check (public.current_org_role(organization_id) is not null);
