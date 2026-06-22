alter table public.reel_projects
  add column if not exists storyboard text not null default '[]';

update public.reel_projects
set storyboard = '[]'
where storyboard is null or btrim(storyboard) = '';
