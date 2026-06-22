-- Phase 26: unified real-provider AI orchestration and observability.
create table if not exists public.ai_prompt_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  template_key text not null,
  name text not null,
  task_type text not null default 'generate',
  system_prompt text,
  prompt_template text not null,
  default_provider text,
  version integer not null default 1,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_prompt_templates_provider_check check(default_provider is null or default_provider in ('openai','gemini','claude'))
);
create unique index if not exists ai_prompt_templates_global_key_idx on public.ai_prompt_templates(template_key) where organization_id is null;
create unique index if not exists ai_prompt_templates_org_key_idx on public.ai_prompt_templates(organization_id,template_key) where organization_id is not null;

create table if not exists public.ai_provider_pricing (
  id uuid primary key default gen_random_uuid(), provider text not null, model text not null,
  input_usd_per_million numeric(12,6) not null, output_usd_per_million numeric(12,6) not null,
  source_note text, effective_from date not null default current_date, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(provider,model,effective_from),
  constraint ai_provider_pricing_provider_check check(provider in ('openai','gemini','claude'))
);

create table if not exists public.ai_request_logs (
  id uuid primary key default gen_random_uuid(), request_id uuid not null unique default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null, user_id uuid references auth.users(id) on delete set null,
  endpoint text not null, request_type text not null, prompt_template_key text, requested_provider text not null default 'auto',
  provider_used text, model text, status text not null, fallback_count integer not null default 0,
  input_tokens integer not null default 0, output_tokens integer not null default 0, total_tokens integer not null default 0,
  estimated_cost_usd numeric(12,6) not null default 0, latency_ms integer not null default 0,
  prompt_text text, response_text text, error_message text, attempts jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(),
  constraint ai_request_logs_provider_check check(provider_used is null or provider_used in ('openai','gemini','claude')),
  constraint ai_request_logs_status_check check(status in ('success','failed'))
);

create table if not exists public.ai_provider_health_checks (
  provider text primary key, status text not null default 'missing_credentials', model text,
  last_checked_at timestamptz not null default now(), last_success_at timestamptz, last_failure_at timestamptz,
  last_latency_ms integer, consecutive_failures integer not null default 0, last_error text,
  total_requests bigint not null default 0, total_failures bigint not null default 0, updated_at timestamptz not null default now(),
  constraint ai_provider_health_provider_check check(provider in ('openai','gemini','claude')),
  constraint ai_provider_health_status_check check(status in ('ready','degraded','down','missing_credentials'))
);

create index if not exists ai_request_logs_org_created_idx on public.ai_request_logs(organization_id,created_at desc);
create index if not exists ai_request_logs_provider_created_idx on public.ai_request_logs(provider_used,created_at desc);
create index if not exists ai_request_logs_status_created_idx on public.ai_request_logs(status,created_at desc);

insert into public.ai_prompt_templates(template_key,name,task_type,system_prompt,prompt_template,default_provider) values
('general_chat','General workspace chat','chat','You are ReelMind AI, a precise and practical agency operations copilot.','{{message}}',null),
('content_generation','Agency content generation','generate','You are a senior content strategist. Return polished, specific, client-ready work.','Create {{content_type}} for {{brand}}. Topic: {{topic}}. Audience: {{audience}}. Tone: {{tone}}. Platform: {{platform}}. Objective: {{objective}}.',null),
('executive_summary','Executive summary','generate','You are an agency strategy director. Be concise, evidence-led, and commercially useful.','Create an executive summary from the following context:\n\n{{context}}',null)
on conflict do nothing;

-- Estimate-only starter rate cards. Update these rows whenever provider pricing changes.
insert into public.ai_provider_pricing(provider,model,input_usd_per_million,output_usd_per_million,source_note) values
('openai','gpt-4.1-mini',0.400000,1.600000,'Initial estimate; verify against current provider pricing.'),
('gemini','gemini-2.5-flash',0.300000,2.500000,'Initial estimate; verify tier and context pricing.'),
('claude','claude-3-5-sonnet-latest',3.000000,15.000000,'Initial estimate; override when changing the configured Claude model.')
on conflict do nothing;
insert into public.ai_provider_health_checks(provider,status) values ('openai','missing_credentials'),('gemini','missing_credentials'),('claude','missing_credentials') on conflict(provider) do nothing;

alter table public.ai_prompt_templates enable row level security; alter table public.ai_provider_pricing enable row level security;
alter table public.ai_request_logs enable row level security; alter table public.ai_provider_health_checks enable row level security;
create policy "Members read global and workspace AI prompts" on public.ai_prompt_templates for select to authenticated using(organization_id is null or public.current_org_role(organization_id) is not null or public.is_platform_admin());
create policy "Content roles manage workspace AI prompts" on public.ai_prompt_templates for all to authenticated using(organization_id is not null and public.current_org_role(organization_id) in ('owner','admin','manager','editor')) with check(organization_id is not null and public.current_org_role(organization_id) in ('owner','admin','manager','editor'));
create policy "Platform admins read AI pricing" on public.ai_provider_pricing for select to authenticated using(public.is_platform_admin());
create policy "Super admins manage AI pricing" on public.ai_provider_pricing for all to authenticated using(public.is_platform_admin('super_admin')) with check(public.is_platform_admin('super_admin'));
create policy "Members read workspace AI usage" on public.ai_request_logs for select to authenticated using(public.current_org_role(organization_id) is not null or public.is_platform_admin());
create policy "Platform admins read AI health" on public.ai_provider_health_checks for select to authenticated using(public.is_platform_admin());
