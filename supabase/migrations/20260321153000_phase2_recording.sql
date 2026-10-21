-- Lessonova Phase 2: students, lessons, recording, processing

create type public.lesson_status as enum (
  'draft',
  'recording',
  'uploading',
  'queued',
  'transcribing',
  'analyzing',
  'ready_for_review',
  'completed',
  'failed',
  'cancelled'
);

create type public.teaching_platform as enum (
  'google_meet',
  'zoom_web',
  'microsoft_teams_web',
  'preply',
  'italki',
  'cambly',
  'other_browser_call'
);

create type public.recording_asset_kind as enum (
  'teacher_microphone',
  'classroom_tab'
);

create type public.processing_job_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  email text,
  english_level text,
  learning_objectives text,
  timezone text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  consent_text_version text not null,
  consented_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete restrict,
  organization_id uuid,
  teaching_platform public.teaching_platform not null,
  status public.lesson_status not null default 'draft',
  browser_name text,
  browser_capability jsonb not null default '{}'::jsonb,
  microphone_capture_status text,
  classroom_audio_capture_status text,
  recording_duration_seconds integer,
  consent_record_id uuid references public.consent_records (id),
  transcription_provider text,
  transcription_cost_estimate numeric(12, 4),
  analysis_cost_estimate numeric(12, 4),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.recording_assets (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  kind public.recording_asset_kind not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text,
  byte_size bigint,
  duration_ms integer,
  created_at timestamptz not null default now(),
  unique (lesson_id, kind)
);

create table public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  status public.processing_job_status not null default 'queued',
  transcription_provider text,
  fallback_used boolean not null default false,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.transcript_segments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  source public.recording_asset_kind not null,
  speaker_label text not null,
  started_at_ms integer not null,
  ended_at_ms integer,
  text text not null,
  confidence numeric(5, 4),
  created_at timestamptz not null default now()
);

create table public.recording_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references public.profiles (id) on delete set null,
  lesson_id uuid references public.lessons (id) on delete set null,
  teaching_platform public.teaching_platform,
  event_type text not null,
  browser_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create trigger processing_jobs_set_updated_at
before update on public.processing_jobs
for each row execute function public.set_updated_at();

alter table public.students enable row level security;
alter table public.consent_records enable row level security;
alter table public.lessons enable row level security;
alter table public.recording_assets enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.transcript_segments enable row level security;
alter table public.recording_telemetry_events enable row level security;

create policy "Teachers manage own students"
on public.students for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create policy "Teachers manage own consent records"
on public.consent_records for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create policy "Teachers manage own lessons"
on public.lessons for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create policy "Teachers manage own recording assets"
on public.recording_assets for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create policy "Teachers manage own processing jobs"
on public.processing_jobs for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create policy "Teachers read own transcript segments"
on public.transcript_segments for select
using (
  exists (
    select 1 from public.lessons l
    where l.id = lesson_id and l.teacher_id = auth.uid()
  )
);

create policy "Teachers insert own telemetry"
on public.recording_telemetry_events for insert
with check (auth.uid() = teacher_id);

create policy "Super admins read telemetry"
on public.recording_telemetry_events for select
using (public.is_platform_super_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-recordings',
  'lesson-recordings',
  false,
  524288000,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do nothing;

create policy "Teachers upload own lesson recordings"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lesson-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Teachers read own lesson recordings"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lesson-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Teachers update own lesson recordings"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lesson-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'lesson-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Teachers delete own lesson recordings"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lesson-recordings'
  and (storage.foldername(name))[1] = auth.uid()::text
);
