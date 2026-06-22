alter table public.video_assets
  drop constraint if exists video_assets_provider_check;

alter table public.video_assets
  add constraint video_assets_provider_check
  check (provider in ('veo', 'kling', 'runway', 'luma', 'pika', 'demo', 'placeholder'));
