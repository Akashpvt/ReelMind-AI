alter table public.reel_projects
  add column if not exists thumbnail_url text,
  add column if not exists export_count integer not null default 0
    check (export_count >= 0),
  add column if not exists image_provider text
    check (image_provider is null or image_provider in ('gemini', 'pollinations', 'placeholder')),
  add column if not exists generation_time_ms integer
    check (generation_time_ms is null or generation_time_ms >= 0);

alter table public.reel_projects
  drop constraint if exists reel_projects_image_provider_check;

alter table public.reel_projects
  add constraint reel_projects_image_provider_check
  check (image_provider is null or image_provider in ('gemini', 'pollinations', 'placeholder'));

alter table public.creator_usage
  add column if not exists credits integer not null default 20
    check (credits >= 0),
  add column if not exists generations_count bigint not null default 0
    check (generations_count >= 0),
  add column if not exists export_count bigint not null default 0
    check (export_count >= 0),
  add column if not exists image_generations bigint not null default 0
    check (image_generations >= 0);

update public.creator_usage
set credits = 20
where credits is null;

create or replace function public.increment_creator_usage(metric text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.creator_usage (user_id)
  values ((select auth.uid()))
  on conflict (user_id) do nothing;

  if metric = 'generation' then
    update public.creator_usage
    set
      generations_count = generations_count + 1,
      credits = greatest(credits - 1, 0)
    where user_id = (select auth.uid());
  elsif metric = 'image_generation' then
    update public.creator_usage
    set image_generations = image_generations + 1
    where user_id = (select auth.uid());
  elsif metric = 'export' then
    update public.creator_usage
    set export_count = export_count + 1
    where user_id = (select auth.uid());
  else
    raise exception 'Unknown usage metric';
  end if;
end;
$$;

revoke all on function public.increment_creator_usage(text) from public;
grant execute on function public.increment_creator_usage(text) to authenticated;
