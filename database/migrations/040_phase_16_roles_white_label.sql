-- Phase 16: normalize workspace roles and add white-label configuration.
update public.organization_members set role = 'editor' where role = 'creator';
update public.organization_members set role = 'viewer' where role = 'client';
update public.organization_invites set role = 'editor' where role = 'creator';
update public.organization_invites set role = 'viewer' where role = 'client';

alter table public.organization_members drop constraint if exists organization_members_role_check;
alter table public.organization_members add constraint organization_members_role_check
  check (role in ('owner', 'admin', 'manager', 'editor', 'viewer'));

alter table public.organization_invites drop constraint if exists organization_invites_role_check;
alter table public.organization_invites add constraint organization_invites_role_check
  check (role in ('admin', 'manager', 'editor', 'viewer'));

alter table public.organization_settings
  add column if not exists agency_name text,
  add column if not exists logo_url text,
  add column if not exists primary_color text not null default '#38BDF8',
  add column if not exists support_email text,
  add column if not exists custom_footer text,
  add column if not exists custom_domain text,
  add column if not exists domain_status text not null default 'unverified',
  add column if not exists session_timeout_minutes integer not null default 1440;

alter table public.organization_settings drop constraint if exists organization_settings_primary_color_check;
alter table public.organization_settings add constraint organization_settings_primary_color_check
  check (primary_color ~ '^#[0-9A-Fa-f]{6}$');
alter table public.organization_settings drop constraint if exists organization_settings_domain_status_check;
alter table public.organization_settings add constraint organization_settings_domain_status_check
  check (domain_status in ('unverified', 'pending', 'verified', 'failed'));
alter table public.organization_settings drop constraint if exists organization_settings_session_timeout_check;
alter table public.organization_settings add constraint organization_settings_session_timeout_check
  check (session_timeout_minutes between 15 and 10080);

create unique index if not exists organization_settings_custom_domain_unique_idx
  on public.organization_settings(lower(custom_domain)) where custom_domain is not null;

alter table public.organization_settings enable row level security;
drop policy if exists "Members can read organization settings" on public.organization_settings;
create policy "Members can read organization settings" on public.organization_settings
  for select to authenticated using (public.current_org_role(organization_id) is not null);
drop policy if exists "Owners and admins can manage organization settings" on public.organization_settings;
create policy "Owners and admins can manage organization settings" on public.organization_settings
  for all to authenticated
  using (public.current_org_role(organization_id) in ('owner', 'admin'))
  with check (public.current_org_role(organization_id) in ('owner', 'admin'));

create or replace function public.can_edit_org_assets(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_org_role(target_organization_id) in ('owner', 'admin', 'manager', 'editor'), false)
$$;

create or replace function public.can_manage_org_projects(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_org_role(target_organization_id) in ('owner', 'admin', 'manager'), false)
$$;

drop policy if exists "Members and clients can read projects" on public.client_projects;
create policy "Workspace members can read projects" on public.client_projects for select to authenticated
  using (public.current_org_role(organization_id) is not null or assigned_to = (select auth.uid()));
drop policy if exists "Organization members can create project activity" on public.project_activity_logs;
create policy "Editors can create project activity" on public.project_activity_logs for insert to authenticated
  with check (public.current_org_role(organization_id) in ('owner', 'admin', 'manager', 'editor'));

drop policy if exists "Managers can create leads" on public.leads;
create policy "Managers can create leads" on public.leads for insert to authenticated
  with check (public.current_org_role(organization_id) in ('owner', 'manager'));
drop policy if exists "Managers can update leads" on public.leads;
create policy "Managers can update leads" on public.leads for update to authenticated
  using (public.current_org_role(organization_id) in ('owner', 'manager'))
  with check (public.current_org_role(organization_id) in ('owner', 'manager'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-branding', 'workspace-branding', true, 2097152, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = 2097152;

drop policy if exists "Public can view workspace branding" on storage.objects;
create policy "Public can view workspace branding" on storage.objects for select
  using (bucket_id = 'workspace-branding');
drop policy if exists "Admins can upload workspace branding" on storage.objects;
create policy "Admins can upload workspace branding" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'workspace-branding'
    and public.current_org_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );
drop policy if exists "Admins can update workspace branding" on storage.objects;
create policy "Admins can update workspace branding" on storage.objects for update to authenticated
  using (
    bucket_id = 'workspace-branding'
    and public.current_org_role(((storage.foldername(name))[1])::uuid) in ('owner', 'admin')
  );
