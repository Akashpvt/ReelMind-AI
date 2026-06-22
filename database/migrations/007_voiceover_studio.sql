alter table public.reel_projects
  add column if not exists voiceover text not null default '{}';

update public.reel_projects
set voiceover = '{}'
where voiceover is null or btrim(voiceover) = '';
