create or replace function public.create_organization_with_owner(
  organization_name text,
  organization_slug text
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  created_organization public.organizations%rowtype;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if organization_name is null or length(trim(organization_name)) = 0 then
    raise exception 'Organization name is required';
  end if;

  if organization_slug is null or length(trim(organization_slug)) = 0 then
    raise exception 'Organization slug is required';
  end if;

  insert into public.organizations (owner_id, name, slug)
  values (current_user_id, trim(organization_name), trim(organization_slug))
  returning * into created_organization;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    invited_by,
    joined_at
  )
  values (
    created_organization.id,
    current_user_id,
    'owner',
    'active',
    current_user_id,
    now()
  );

  insert into public.team_activity_logs (
    organization_id,
    user_id,
    action,
    metadata
  )
  values (
    created_organization.id,
    current_user_id,
    'organization_created',
    jsonb_build_object('name', created_organization.name)
  );

  return jsonb_build_object(
    'id', created_organization.id,
    'owner_id', created_organization.owner_id,
    'name', created_organization.name,
    'slug', created_organization.slug,
    'created_at', created_organization.created_at
  );
end;
$$;

revoke all on function public.create_organization_with_owner(text, text) from public;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;

insert into public.organization_members (
  organization_id,
  user_id,
  role,
  status,
  invited_by,
  joined_at
)
select
  organizations.id,
  organizations.owner_id,
  'owner',
  'active',
  organizations.owner_id,
  organizations.created_at
from public.organizations
where organizations.owner_id is not null
  and not exists (
    select 1
    from public.organization_members
    where organization_members.organization_id = organizations.id
      and organization_members.role = 'owner'
      and organization_members.status = 'active'
  )
on conflict (organization_id, user_id) do update
  set role = 'owner',
      status = 'active',
      invited_by = excluded.invited_by,
      joined_at = coalesce(public.organization_members.joined_at, excluded.joined_at);
