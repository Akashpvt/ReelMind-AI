alter table public.reel_projects
  add column if not exists image_provider text
    check (image_provider is null or image_provider in ('gemini', 'pollinations', 'placeholder')),
  add column if not exists generation_time_ms integer
    check (generation_time_ms is null or generation_time_ms >= 0);

create index if not exists activity_logs_daily_thumbnail_usage_idx
  on public.activity_logs (user_id, created_at desc)
  where action = 'image_generated';
