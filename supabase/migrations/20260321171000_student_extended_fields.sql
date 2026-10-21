-- Fields shown on full-page add student (exam, teaching notes, rate)

alter table public.students
  add column if not exists target_exam text,
  add column if not exists areas_to_improve text,
  add column if not exists hourly_rate numeric(10, 2);

comment on column public.students.target_exam is 'Optional exam target e.g. IELTS 7.5';
comment on column public.students.areas_to_improve is 'Comma-separated weaknesses to watch';
comment on column public.students.hourly_rate is 'Private tutor hourly rate';
