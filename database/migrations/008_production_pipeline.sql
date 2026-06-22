alter table public.reel_projects
  add column if not exists production_pack text not null default '{}';

update public.reel_projects
set production_pack = '{}'
where production_pack is null or btrim(production_pack) = '';
