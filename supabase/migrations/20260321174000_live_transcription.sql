create table if not exists public.platform_live_transcription_settings (
  id uuid primary key default gen_random_uuid(),
  live_transcription_enabled boolean not null default false,
  streaming_provider text not null default 'deepgram',
  streaming_model text not null default 'nova-3',
  live_corrections_enabled boolean not null default false,
  max_live_correction_requests_per_lesson integer not null default 8,
  live_correction_interval_seconds integer not null default 20,
  post_lesson_retranscription_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint platform_live_transcription_settings_singleton
    check (id = '00000000-0000-0000-0000-000000000003'::uuid)
);

insert into public.platform_live_transcription_settings (id)
values ('00000000-0000-0000-0000-000000000003'::uuid)
on conflict (id) do nothing;

create table if not exists public.lesson_live_transcript_utterances (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  source public.recording_asset_kind not null,
  speaker_role text not null check (speaker_role in ('teacher', 'student', 'unknown')),
  deepgram_request_id text,
  segment_key text not null,
  is_final boolean not null default false,
  started_at_ms integer not null default 0,
  ended_at_ms integer,
  raw_text text not null,
  created_at timestamptz not null default now(),
  unique (lesson_id, segment_key)
);

create table if not exists public.lesson_live_grammar_suggestions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  utterance_segment_key text not null,
  original_text text not null,
  suggested_text text not null,
  explanation text,
  dismissed boolean not null default false,
  teacher_approved boolean,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6),
  created_at timestamptz not null default now()
);

alter table public.platform_live_transcription_settings enable row level security;
alter table public.lesson_live_transcript_utterances enable row level security;
alter table public.lesson_live_grammar_suggestions enable row level security;

create policy "Super admins manage live transcription settings"
on public.platform_live_transcription_settings for all
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

create policy "Teachers manage own live utterances"
on public.lesson_live_transcript_utterances for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create policy "Teachers manage own live grammar suggestions"
on public.lesson_live_grammar_suggestions for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);

create trigger platform_live_transcription_settings_set_updated_at
before update on public.platform_live_transcription_settings
for each row execute function public.set_updated_at();
