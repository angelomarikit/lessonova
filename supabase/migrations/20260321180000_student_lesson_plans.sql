create table if not exists public.student_lesson_plan_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  position integer not null default 0,
  scheduled_for timestamptz,
  title text not null,
  focus text not null default '',
  plan text not null default '',
  source text not null default 'manual' check (source in ('manual', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_lesson_plan_items_student_idx
  on public.student_lesson_plan_items (student_id, position);

alter table public.student_lesson_plan_items enable row level security;

create policy "Teachers manage own lesson plans"
on public.student_lesson_plan_items for all
using (auth.uid() = teacher_id)
with check (auth.uid() = teacher_id);
