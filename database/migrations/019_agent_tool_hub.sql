create table if not exists public.tool_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider_key text not null,
  name text not null,
  category text not null,
  status text not null default 'disconnected',
  quota_state text not null default 'normal',
  latency_ms integer not null default 0,
  last_checked timestamp with time zone default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, provider_key)
);

create table if not exists public.tool_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider_key text not null,
  credential_label text,
  encrypted_secret text,
  status text not null default 'missing_credentials',
  last_rotated_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, provider_key)
);

create table if not exists public.agent_tool_mapping (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  agent_type text not null,
  category text not null,
  primary_provider text not null,
  fallback_provider text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique (user_id, agent_type)
);

create table if not exists public.tool_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  project_id uuid references public.reel_projects(id) on delete set null,
  agent_type text not null,
  provider_key text not null,
  action text not null,
  status text not null,
  tokens integer not null default 0,
  credits integer not null default 0,
  latency_ms integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default now()
);

create table if not exists public.provider_health (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  provider_key text not null,
  health text not null default 'missing_credentials',
  status text not null default 'missing_credentials',
  latency_ms integer not null default 0,
  error_message text,
  checked_at timestamp with time zone default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, provider_key)
);

create index if not exists tool_providers_user_category_idx
  on public.tool_providers (user_id, category);

create index if not exists agent_tool_mapping_user_agent_idx
  on public.agent_tool_mapping (user_id, agent_type);

create index if not exists tool_usage_logs_user_created_at_idx
  on public.tool_usage_logs (user_id, created_at desc);

create index if not exists provider_health_user_status_idx
  on public.provider_health (user_id, status, checked_at desc);

alter table public.tool_providers enable row level security;
alter table public.tool_credentials enable row level security;
alter table public.agent_tool_mapping enable row level security;
alter table public.tool_usage_logs enable row level security;
alter table public.provider_health enable row level security;

drop policy if exists "Users can read safe tool provider status" on public.tool_providers;
create policy "Users can read safe tool provider status"
  on public.tool_providers for select to authenticated
  using (user_id is null or auth.uid() = user_id);

drop policy if exists "Users can manage their tool providers" on public.tool_providers;
create policy "Users can manage their tool providers"
  on public.tool_providers for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their tool providers" on public.tool_providers;
create policy "Users can update their tool providers"
  on public.tool_providers for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users cannot read raw tool credentials" on public.tool_credentials;
create policy "Users cannot read raw tool credentials"
  on public.tool_credentials for select to authenticated
  using (false);

drop policy if exists "Users can insert credential placeholders" on public.tool_credentials;
create policy "Users can insert credential placeholders"
  on public.tool_credentials for insert to authenticated
  with check (auth.uid() = user_id and encrypted_secret is null);

drop policy if exists "Users can delete their credential placeholders" on public.tool_credentials;
create policy "Users can delete their credential placeholders"
  on public.tool_credentials for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their agent tool mapping" on public.agent_tool_mapping;
create policy "Users can manage their agent tool mapping"
  on public.agent_tool_mapping for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read their tool usage logs" on public.tool_usage_logs;
create policy "Users can read their tool usage logs"
  on public.tool_usage_logs for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their tool usage logs" on public.tool_usage_logs;
create policy "Users can insert their tool usage logs"
  on public.tool_usage_logs for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can read provider health" on public.provider_health;
create policy "Users can read provider health"
  on public.provider_health for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert provider health" on public.provider_health;
create policy "Users can upsert provider health"
  on public.provider_health for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
