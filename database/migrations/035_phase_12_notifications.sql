create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.client_projects(id) on delete cascade,
  title text,
  message text,
  type text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  constraint notifications_type_check
    check (type in (
      'project_assigned',
      'project_status_changed',
      'client_approved',
      'client_requested_revision',
      'invoice_created',
      'invoice_paid',
      'message_received',
      'file_uploaded',
      'lead_created',
      'lead_status_changed',
      'lead_converted',
      'subscription_updated',
      'usage_limit_reached'
    ))
);

create index if not exists notifications_org_user_idx
  on public.notifications(organization_id, user_id, is_read, created_at desc);

create index if not exists notifications_project_idx
  on public.notifications(project_id, created_at desc);

create index if not exists notifications_type_idx
  on public.notifications(type, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
  on public.notifications for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.current_org_role(organization_id) is not null
  );

drop policy if exists "Users can mark own notifications read" on public.notifications;
create policy "Users can mark own notifications read"
  on public.notifications for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.current_org_role(organization_id) is not null
  )
  with check (
    user_id = (select auth.uid())
    and public.current_org_role(organization_id) is not null
  );

drop policy if exists "Members can create notifications" on public.notifications;
create policy "Members can create notifications"
  on public.notifications for insert to authenticated
  with check (public.current_org_role(organization_id) is not null);
