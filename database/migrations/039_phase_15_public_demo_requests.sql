create table if not exists public.public_demo_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  company text not null,
  phone text,
  agency_size text not null,
  message text,
  status text not null default 'new',
  source text not null default 'public_website',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_demo_requests_status_check
    check (status in ('new', 'contacted', 'qualified', 'converted', 'closed'))
);

create index if not exists public_demo_requests_status_created_idx
  on public.public_demo_requests(status, created_at desc);

alter table public.public_demo_requests enable row level security;

-- Requests are written only by the server with the service role. Public clients
-- intentionally receive no table policy, preventing direct reads or writes.

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'project_assigned', 'project_status_changed', 'client_approved',
    'client_requested_revision', 'invoice_created', 'invoice_paid',
    'message_received', 'file_uploaded', 'lead_created',
    'lead_status_changed', 'lead_converted', 'subscription_updated',
    'usage_limit_reached', 'demo_requested'
  ));
