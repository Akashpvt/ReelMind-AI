alter table public.client_projects
  drop constraint if exists client_projects_status_check;

alter table public.client_projects
  add constraint client_projects_status_check
    check (status in ('brief', 'planning', 'scripting', 'production', 'review', 'approved', 'revision_requested', 'delivered', 'archived'));
