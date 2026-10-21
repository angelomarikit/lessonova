-- Extended student profile fields (goals, background, interests)

alter table public.students
  add column if not exists native_language text,
  add column if not exists target_accent text,
  add column if not exists interests text;

comment on column public.students.learning_objectives is 'Primary learning goal (e.g. exam prep, business English).';
comment on column public.students.native_language is 'Student L1 for tailoring feedback.';
comment on column public.students.target_accent is 'Preferred English accent focus.';
comment on column public.students.interests is 'Topics the student cares about for lesson personalization.';
