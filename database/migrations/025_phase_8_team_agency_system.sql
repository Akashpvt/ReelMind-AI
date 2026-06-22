create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

alter table public.organizations
  add column if not exists slug text;

update public.organizations
  set slug = lower(regexp_replace(coalesce(slug, name || '-' || left(id::text, 8)), '[^a-zA-Z0-9]+', '-', 'g'))
  where slug is null or slug = '';

alter table public.organizations
  alter column slug set not null;

create unique index if not exists organizations_slug_unique_idx on public.organizations(slug);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'manager', 'editor', 'creator', 'client')),
  status text not null default 'active' check (status in ('active', 'removed', 'invited')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'editor', 'creator', 'client')),
  invite_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create table if not exists public.client_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid references auth.users(id) on delete set null,
  project_name text not null,
  status text not null default 'active' check (status in ('active', 'draft', 'review', 'completed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.team_activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists organizations_owner_idx on public.organizations(owner_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id, organization_id);
create index if not exists organization_members_org_idx on public.organization_members(organization_id, role, status);
create index if not exists organization_invites_email_idx on public.organization_invites(lower(email), expires_at);
create index if not exists client_projects_org_created_idx on public.client_projects(organization_id, created_at desc);
create index if not exists client_projects_client_idx on public.client_projects(client_id, created_at desc);
create index if not exists team_activity_org_created_idx on public.team_activity_logs(organization_id, created_at desc);

create or replace function public.current_org_role(target_organization_id uuid)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select role
  from public.organization_members
  where organization_id = target_organization_id
    and user_id = (select auth.uid())
    and status = 'active'
  limit 1
$$;

create or replace function public.can_manage_org_members(target_organization_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(public.current_org_role(target_organization_id) in ('owner', 'admin'), false)
$$;

create or replace function public.can_manage_org_projects(target_organization_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(public.current_org_role(target_organization_id) in ('owner', 'admin', 'manager'), false)
$$;

create or replace function public.can_edit_org_assets(target_organization_id uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(public.current_org_role(target_organization_id) in ('owner', 'admin', 'manager', 'editor', 'creator'), false)
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invites enable row level security;
alter table public.client_projects enable row level security;
alter table public.team_activity_logs enable row level security;

drop policy if exists "Members can read organizations" on public.organizations;
create policy "Members can read organizations"
  on public.organizations for select to authenticated
  using (owner_id = (select auth.uid()) or public.current_org_role(id) is not null);

drop policy if exists "Users can create organizations" on public.organizations;
create policy "Users can create organizations"
  on public.organizations for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update organizations" on public.organizations;
create policy "Owners can update organizations"
  on public.organizations for update to authenticated
  using (owner_id = (select auth.uid()) or public.current_org_role(id) = 'owner')
  with check (owner_id = (select auth.uid()) or public.current_org_role(id) = 'owner');

drop policy if exists "Members can read organization members" on public.organization_members;
create policy "Members can read organization members"
  on public.organization_members for select to authenticated
  using (user_id = (select auth.uid()) or public.current_org_role(organization_id) is not null);

drop policy if exists "Owners can create own owner membership" on public.organization_members;
drop policy if exists "Owners can create owner membership" on public.organization_members;
drop policy if exists "Bootstrap owner/admin membership or managed member insert" on public.organization_members;
create policy "Bootstrap owner/admin membership or managed member insert"
  on public.organization_members for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and role in ('owner', 'admin')
      and exists (
        select 1
        from public.organizations
        where id = organization_id
          and owner_id = (select auth.uid())
      )
    )
    or public.can_manage_org_members(organization_id)
  );

drop policy if exists "Owners and admins can update members" on public.organization_members;
create policy "Owners and admins can update members"
  on public.organization_members for update to authenticated
  using (public.can_manage_org_members(organization_id))
  with check (public.can_manage_org_members(organization_id));

drop policy if exists "Users can read relevant organization invites" on public.organization_invites;
create policy "Users can read relevant organization invites"
  on public.organization_invites for select to authenticated
  using (
    public.can_manage_org_members(organization_id)
    or lower(email) = lower(coalesce((select email from auth.users where id = (select auth.uid())), ''))
  );

drop policy if exists "Owners and admins can create invites" on public.organization_invites;
create policy "Owners and admins can create invites"
  on public.organization_invites for insert to authenticated
  with check (public.can_manage_org_members(organization_id));

drop policy if exists "Owners invitees can update invites" on public.organization_invites;
create policy "Owners invitees can update invites"
  on public.organization_invites for update to authenticated
  using (
    public.can_manage_org_members(organization_id)
    or lower(email) = lower(coalesce((select email from auth.users where id = (select auth.uid())), ''))
  )
  with check (
    public.can_manage_org_members(organization_id)
    or lower(email) = lower(coalesce((select email from auth.users where id = (select auth.uid())), ''))
  );

drop policy if exists "Members and clients can read projects" on public.client_projects;
create policy "Members and clients can read projects"
  on public.client_projects for select to authenticated
  using (public.current_org_role(organization_id) is not null or client_id = (select auth.uid()));

drop policy if exists "Managers can create projects" on public.client_projects;
create policy "Managers can create projects"
  on public.client_projects for insert to authenticated
  with check (public.can_manage_org_projects(organization_id));

drop policy if exists "Managers can update projects" on public.client_projects;
create policy "Managers can update projects"
  on public.client_projects for update to authenticated
  using (public.can_manage_org_projects(organization_id))
  with check (public.can_manage_org_projects(organization_id));

drop policy if exists "Members can read team activity" on public.team_activity_logs;
create policy "Members can read team activity"
  on public.team_activity_logs for select to authenticated
  using (public.current_org_role(organization_id) is not null);

drop policy if exists "Members can create team activity" on public.team_activity_logs;
create policy "Members can create team activity"
  on public.team_activity_logs for insert to authenticated
  with check (user_id = (select auth.uid()) and public.current_org_role(organization_id) is not null);

drop policy if exists "Organization members can read member profiles" on public.profiles;
create policy "Organization members can read member profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.organization_members viewer
      join public.organization_members subject
        on subject.organization_id = viewer.organization_id
      where viewer.user_id = (select auth.uid())
        and viewer.status = 'active'
        and subject.user_id = public.profiles.id
        and subject.status = 'active'
    )
  );
