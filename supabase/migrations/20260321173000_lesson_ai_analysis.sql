create type public.lesson_ai_report_status as enum (
  'draft',
  'generating',
  'ready',
  'approved',
  'failed'
);

create table public.lesson_ai_reports (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete restrict,
  organization_id uuid,
  transcript_version text not null,
  status public.lesson_ai_report_status not null default 'draft',
  approval_status text not null default 'draft'
    check (approval_status in ('draft', 'approved')),
  model text,
  report_json jsonb,
  edited_report_json jsonb,
  student_facing_json jsonb,
  error_message text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  processing_duration_ms integer,
  generated_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id)
);

create table public.lesson_ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete set null,
  teacher_id uuid references public.profiles (id) on delete set null,
  report_id uuid references public.lesson_ai_reports (id) on delete set null,
  model text not null,
  success boolean not null default false,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  processing_duration_ms integer,
  error_message text,
  test_mode boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.platform_ai_analysis_settings (
  id uuid primary key default gen_random_uuid(),
  default_model text not null default 'claude-haiku-5-5',
  automatic_analysis_enabled boolean not null default false,
  max_input_tokens integer not null default 3000,
  max_output_tokens integer not null default 800,
  regeneration_allowed boolean not null default false,
  test_mode_budget_usd numeric(8, 2) not null default 1.00,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint platform_ai_analysis_settings_singleton
    check (id = '00000000-0000-0000-0000-000000000002'::uuid)
);

insert into public.platform_ai_analysis_settings (id)
values ('00000000-0000-0000-0000-000000000002'::uuid)
on conflict (id) do nothing;

create trigger lesson_ai_reports_set_updated_at
before update on public.lesson_ai_reports
for each row execute function public.set_updated_at();

create trigger platform_ai_analysis_settings_set_updated_at
before update on public.platform_ai_analysis_settings
for each row execute function public.set_updated_at();

alter table public.lesson_ai_reports enable row level security;
alter table public.lesson_ai_usage_logs enable row level security;
alter table public.platform_ai_analysis_settings enable row level security;

create policy "Teachers manage own lesson AI reports"
on public.lesson_ai_reports for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create policy "Teachers read own AI usage logs"
on public.lesson_ai_usage_logs for select
using (auth.uid() = teacher_id);

create policy "Super admins read AI usage logs"
on public.lesson_ai_usage_logs for select
using (public.is_platform_super_admin());

create policy "Super admins manage AI analysis settings"
on public.platform_ai_analysis_settings for all
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());
