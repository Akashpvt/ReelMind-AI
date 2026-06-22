create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_account_id text not null,
  phone_number_id text not null unique,
  display_phone_number text,
  access_token_encrypted text not null,
  app_secret_encrypted text,
  verify_token_hash text not null,
  status text not null default 'active',
  last_webhook_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id),
  constraint whatsapp_connections_status_check check (status in ('active','paused','disconnected'))
);

create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.whatsapp_connections(id) on delete set null,
  project_id uuid references public.client_projects(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  whatsapp_message_id text unique,
  direction text not null,
  message_type text not null default 'text',
  contact_phone text not null,
  contact_name text,
  body text,
  status text not null default 'queued',
  template_name text,
  trigger_event text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint whatsapp_messages_direction_check check (direction in ('inbound','outbound')),
  constraint whatsapp_messages_status_check check (status in ('queued','sent','delivered','read','failed','received'))
);

create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  meta_template_name text,
  language text not null default 'en_US',
  category text not null default 'UTILITY',
  body text not null,
  trigger_event text,
  is_automatic boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id,name,language),
  constraint whatsapp_templates_status_check check (status in ('draft','pending','approved','rejected','disabled'))
);

alter table public.leads add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.client_projects add column if not exists client_phone text;

create index if not exists whatsapp_messages_org_created_idx on public.whatsapp_messages(organization_id,created_at desc);
create index if not exists whatsapp_messages_contact_idx on public.whatsapp_messages(organization_id,contact_phone,created_at desc);
create index if not exists whatsapp_templates_org_trigger_idx on public.whatsapp_templates(organization_id,trigger_event,is_automatic);

alter table public.whatsapp_connections enable row level security;
alter table public.whatsapp_messages enable row level security;
alter table public.whatsapp_templates enable row level security;

create policy "Managers can read WhatsApp connections" on public.whatsapp_connections for select to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Admins can manage WhatsApp connections" on public.whatsapp_connections for all to authenticated using (public.current_org_role(organization_id) in ('owner','admin')) with check (public.current_org_role(organization_id) in ('owner','admin'));
create policy "Managers can read WhatsApp messages" on public.whatsapp_messages for select to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Managers can read WhatsApp templates" on public.whatsapp_templates for select to authenticated using (public.current_org_role(organization_id) in ('owner','admin','manager'));
create policy "Admins can manage WhatsApp templates" on public.whatsapp_templates for all to authenticated using (public.current_org_role(organization_id) in ('owner','admin')) with check (public.current_org_role(organization_id) in ('owner','admin'));

insert into public.whatsapp_templates (organization_id,name,body,trigger_event,is_automatic,status)
select organization.id, template.name, template.body, template.trigger_event, false, 'draft'
from public.organizations organization
cross join (values
 ('Lead welcome','Hi {{name}}, thanks for contacting {{agencyName}}. We have your request and will follow up shortly.','lead_created'),
 ('Project assigned','Your project {{projectTitle}} has been assigned and is moving forward.','project_assigned'),
 ('Review requested','{{projectTitle}} is ready for your review. Reply status for the latest update.','review_requested'),
 ('Project approved','Thanks for approving {{projectTitle}}. We are preparing final delivery.','project_approved'),
 ('Invoice created','Invoice {{invoiceNumber}} for {{amount}} is ready. Reply invoice for details.','invoice_created'),
 ('Invoice overdue','A reminder that invoice {{invoiceNumber}} for {{amount}} is overdue.','invoice_overdue'),
 ('Payment received','Payment received for {{invoiceNumber}}. Thank you.','payment_received'),
 ('Project delivered','{{projectTitle}} has been delivered. Reply files for delivery details.','project_delivered')
) as template(name,body,trigger_event)
on conflict (organization_id,name,language) do nothing;
