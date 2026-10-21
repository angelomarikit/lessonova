-- Lessonova Phase 1 foundation schema

create extension if not exists "pgcrypto";

create type public.app_role as enum (
  'individual_tutor',
  'school_owner',
  'school_admin',
  'school_teacher',
  'platform_super_admin'
);

create type public.billing_interval as enum ('monthly', 'annual');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  monthly_lesson_limit integer,
  trial_lessons integer,
  is_custom_pricing boolean not null default false,
  price_monthly_php numeric(12, 2),
  price_annual_php numeric(12, 2),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  source_type text not null,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.trial_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  email_normalized text not null,
  lessons_granted integer not null default 2,
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (email_normalized)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger subscription_plans_set_updated_at
before update on public.subscription_plans
for each row execute function public.set_updated_at();

create or replace function public.is_platform_super_admin(target_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = target_user
      and ur.role = 'platform_super_admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text;
begin
  normalized_email := lower(trim(new.email));

  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'individual_tutor');

  if normalized_email is not null and normalized_email <> '' then
    insert into public.trial_grants (user_id, email_normalized, lessons_granted)
    values (new.id, normalized_email, 2)
    on conflict do nothing;

    if exists (
      select 1
      from public.trial_grants tg
      where tg.user_id = new.id
    ) then
      insert into public.lesson_credit_ledger (user_id, delta, reason, source_type, source_id)
      values (new.id, 2, 'Initial trial entitlement', 'trial_grant', new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.lesson_credit_ledger enable row level security;
alter table public.trial_grants enable row level security;

create policy "Profiles are viewable by owner or super admin"
on public.profiles for select
using (auth.uid() = id or public.is_platform_super_admin());

create policy "Profiles are updatable by owner"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Roles are viewable by owner or super admin"
on public.user_roles for select
using (auth.uid() = user_id or public.is_platform_super_admin());

create policy "Only super admins manage roles"
on public.user_roles for all
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

create policy "Active subscription plans are public"
on public.subscription_plans for select
using (is_active = true or public.is_platform_super_admin());

create policy "Only super admins manage subscription plans"
on public.subscription_plans for insert
with check (public.is_platform_super_admin());

create policy "Only super admins update subscription plans"
on public.subscription_plans for update
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

create policy "Only super admins delete subscription plans"
on public.subscription_plans for delete
using (public.is_platform_super_admin());

create policy "Users can view their own credit ledger"
on public.lesson_credit_ledger for select
using (auth.uid() = user_id or public.is_platform_super_admin());

create policy "Users can view their own trial grant"
on public.trial_grants for select
using (auth.uid() = user_id or public.is_platform_super_admin());

insert into public.subscription_plans (
  slug,
  name,
  description,
  monthly_lesson_limit,
  trial_lessons,
  is_custom_pricing,
  price_monthly_php,
  price_annual_php,
  features,
  sort_order
) values
  (
    'free-trial',
    'Free Trial',
    'Start with two AI-processed lessons.',
    2,
    2,
    false,
    0,
    0,
    '["2 AI-processed lessons","Student management","Teacher dashboard access"]'::jsonb,
    10
  ),
  (
    'starter',
    'Starter',
    'For tutors getting consistent weekly bookings.',
    30,
    null,
    false,
    null,
    null,
    '["Up to 30 lessons per month","AI reports","Student progress tracking"]'::jsonb,
    20
  ),
  (
    'professional',
    'Professional',
    'For active tutors with a full teaching schedule.',
    75,
    null,
    false,
    null,
    null,
    '["Up to 75 lessons per month","Priority processing queue","Advanced analytics"]'::jsonb,
    30
  ),
  (
    'pro',
    'Pro',
    'For high-volume tutors and small teams.',
    130,
    null,
    false,
    null,
    null,
    '["Up to 130 lessons per month","Expanded report history","Billing support"]'::jsonb,
    40
  ),
  (
    'school',
    'School',
    'Custom allocation for language schools and academies.',
    null,
    null,
    true,
    null,
    null,
    '["Custom lesson allocation","Multiple teachers","Organization dashboard","Shared usage management"]'::jsonb,
    50
  );
