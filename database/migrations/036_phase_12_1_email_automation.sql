create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  email_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_settings_email_idx
  on public.organization_settings(organization_id, email_notifications_enabled);
