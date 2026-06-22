-- Phase 23: Enterprise multi-tenant control plane.
alter table public.organizations
  add column if not exists status text not null default 'active',
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references auth.users(id) on delete set null,
  add column if not exists suspension_reason text,
  add column if not exists updated_at timestamptz not null default now();
alter table public.organizations drop constraint if exists organizations_status_check;
alter table public.organizations add constraint organizations_status_check check (status in ('active','suspended','closed'));

create table if not exists public.platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_admins_role_check check (role in ('super_admin','support_admin')),
  constraint platform_admins_status_check check (status in ('active','disabled'))
);

create table if not exists public.organization_usage (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  active_users integer not null default 0,
  projects_count integer not null default 0,
  leads_count integer not null default 0,
  ai_generations integer not null default 0,
  ai_tokens bigint not null default 0,
  storage_bytes bigint not null default 0,
  messages_count integer not null default 0,
  last_calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_usage_nonnegative check (active_users >= 0 and projects_count >= 0 and leads_count >= 0 and ai_generations >= 0 and ai_tokens >= 0 and storage_bytes >= 0 and messages_count >= 0)
);

create table if not exists public.organization_limits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  max_users integer not null default 1,
  max_projects integer not null default 3,
  max_leads integer not null default 10,
  max_ai_generations integer not null default 20,
  max_storage_bytes bigint not null default 104857600,
  max_monthly_messages integer not null default 100,
  custom_limits boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enterprise_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists organizations_status_idx on public.organizations(status,created_at desc);
create index if not exists organization_usage_period_idx on public.organization_usage(period_start,period_end);
create index if not exists enterprise_audit_org_created_idx on public.enterprise_audit_logs(organization_id,created_at desc);
create index if not exists enterprise_audit_actor_created_idx on public.enterprise_audit_logs(actor_id,created_at desc);

create or replace function public.current_platform_admin_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.platform_admins where user_id = (select auth.uid()) and status = 'active' limit 1
$$;

create or replace function public.current_org_role(target_organization_id uuid)
returns text language sql stable security definer set search_path = '' as $$
  select membership.role
  from public.organization_members membership
  join public.organizations organization on organization.id = membership.organization_id
  where membership.organization_id = target_organization_id
    and membership.user_id = (select auth.uid())
    and membership.status = 'active'
    and organization.status = 'active'
  limit 1
$$;

create or replace function public.is_platform_admin(required_role text default null)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    case when required_role = 'super_admin' then public.current_platform_admin_role() = 'super_admin'
         else public.current_platform_admin_role() in ('super_admin','support_admin') end,
    false
  )
$$;

create or replace function public.initialize_enterprise_organization()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.organization_usage (organization_id) values (new.id) on conflict (organization_id) do nothing;
  insert into public.organization_limits (organization_id) values (new.id) on conflict (organization_id) do nothing;
  return new;
end $$;
drop trigger if exists initialize_enterprise_organization_after_insert on public.organizations;
create trigger initialize_enterprise_organization_after_insert after insert on public.organizations for each row execute function public.initialize_enterprise_organization();
insert into public.organization_usage (organization_id) select id from public.organizations on conflict (organization_id) do nothing;
insert into public.organization_limits (organization_id) select id from public.organizations on conflict (organization_id) do nothing;

create or replace function public.verify_tenant_isolation()
returns table(table_name text, rls_enabled boolean, organization_scoped boolean, verified boolean)
language sql stable security definer set search_path = '' as $$
  with expected(table_name) as (values
    ('organization_members'),('client_projects'),('leads'),('project_files'),('project_messages'),
    ('organization_subscriptions'),('ai_generations'),('content_calendars'),('strategy_reports'),
    ('social_posts'),('whatsapp_messages'),('workflows'),('organization_usage'),('organization_limits')
  )
  select e.table_name,
    coalesce(c.relrowsecurity,false),
    exists(select 1 from information_schema.columns col where col.table_schema='public' and col.table_name=e.table_name and col.column_name='organization_id'),
    coalesce(c.relrowsecurity,false) and exists(select 1 from information_schema.columns col where col.table_schema='public' and col.table_name=e.table_name and col.column_name='organization_id')
  from expected e left join pg_catalog.pg_class c on c.relname=e.table_name and c.relnamespace='public'::regnamespace
  where public.is_platform_admin()
$$;

alter table public.platform_admins enable row level security;
alter table public.organization_usage enable row level security;
alter table public.organization_limits enable row level security;
alter table public.enterprise_audit_logs enable row level security;

create policy "Admins can read own platform role" on public.platform_admins for select to authenticated using (user_id=(select auth.uid()) or public.is_platform_admin('super_admin'));
create policy "Super admins manage platform admins" on public.platform_admins for all to authenticated using (public.is_platform_admin('super_admin')) with check (public.is_platform_admin('super_admin'));
create policy "Tenant members read organization usage" on public.organization_usage for select to authenticated using (public.current_org_role(organization_id) is not null or public.is_platform_admin());
create policy "Platform admins manage organization usage" on public.organization_usage for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "Tenant owners read organization limits" on public.organization_limits for select to authenticated using (public.current_org_role(organization_id) in ('owner','admin') or public.is_platform_admin());
create policy "Super admins manage organization limits" on public.organization_limits for all to authenticated using (public.is_platform_admin('super_admin')) with check (public.is_platform_admin('super_admin'));
create policy "Platform admins read enterprise audit" on public.enterprise_audit_logs for select to authenticated using (public.is_platform_admin());
create policy "Platform admins create enterprise audit" on public.enterprise_audit_logs for insert to authenticated with check (actor_id=(select auth.uid()) and public.is_platform_admin());

create policy "Platform admins read all organizations" on public.organizations for select to authenticated using (public.is_platform_admin());
create policy "Super admins update all organizations" on public.organizations for update to authenticated using (public.is_platform_admin('super_admin')) with check (public.is_platform_admin('super_admin'));

-- Provision the first admin explicitly after applying this migration:
-- insert into public.platform_admins(user_id,role) values ('AUTH_USER_UUID','super_admin');
