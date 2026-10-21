alter table public.lessons
  add column if not exists transcription_model text,
  add column if not exists detected_language text,
  add column if not exists processing_duration_ms integer;

create table if not exists public.transcription_usage_logs (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid references public.lessons (id) on delete set null,
  teacher_id uuid references public.profiles (id) on delete set null,
  processing_job_id uuid references public.processing_jobs (id) on delete set null,
  provider text not null,
  model text not null,
  source public.recording_asset_kind,
  success boolean not null default false,
  audio_duration_ms integer,
  audio_minutes numeric(12, 4),
  processing_duration_ms integer,
  estimated_cost_usd numeric(12, 6),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.transcription_usage_logs enable row level security;

create policy "Teachers and admins read transcription usage logs"
on public.transcription_usage_logs for select
using (auth.uid() = teacher_id or public.is_platform_super_admin());
