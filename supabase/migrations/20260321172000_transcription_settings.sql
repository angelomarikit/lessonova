create table if not exists public.platform_transcription_settings (
  id uuid primary key default gen_random_uuid(),
  primary_mode text not null default 'deepinfra_primary'
    check (primary_mode in ('deepinfra_primary', 'deepgram_primary', 'manual')),
  auto_fallback_enabled boolean not null default false,
  max_retry_attempts integer not null default 1
    check (max_retry_attempts >= 0 and max_retry_attempts <= 3),
  default_deepinfra_model text not null default 'openai/whisper-large-v3-turbo',
  default_deepgram_model text not null default 'nova-3',
  deepgram_diarize_default boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint platform_transcription_settings_singleton
    check (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

insert into public.platform_transcription_settings (id)
values ('00000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

create trigger platform_transcription_settings_set_updated_at
before update on public.platform_transcription_settings
for each row execute function public.set_updated_at();

alter table public.platform_transcription_settings enable row level security;

create policy "Super admins manage transcription settings"
on public.platform_transcription_settings
for all
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

create policy "Super admins read transcription settings"
on public.platform_transcription_settings
for select
using (public.is_platform_super_admin());
