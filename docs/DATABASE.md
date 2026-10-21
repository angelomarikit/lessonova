# Database

Schema migrations live in `supabase/migrations/`.

## Phase 1 tables

| Table | Purpose |
| --- | --- |
| `profiles` | User profile mirror of `auth.users` |
| `user_roles` | RBAC roles (never client-writable for elevation) |
| `subscription_plans` | Admin-managed plans and PHP pricing |
| `lesson_credit_ledger` | Atomic lesson credit accounting |
| `trial_grants` | One-time trial entitlement per normalized email |

## Trial abuse controls (Phase 1 baseline)

- Trigger on `auth.users` creates profile + default `individual_tutor` role
- Trial grant uses unique `email_normalized` constraint
- Credit ledger records initial 2-lesson grant

## Phase 2 tables (recording)

| Table | Purpose |
| --- | --- |
| `students` | Teacher-owned student profiles |
| `consent_records` | Recording consent audit trail |
| `lessons` | Lesson metadata, platform, capture status, processing status |
| `recording_assets` | Teacher microphone + classroom tab audio object paths |
| `processing_jobs` | Transcription / analysis queue state |
| `transcript_segments` | Timestamped transcript lines with source labels |
| `recording_telemetry_events` | Permission/capture compatibility telemetry |

Storage bucket: `lesson-recordings` (private, teacher-scoped paths).

## Upcoming tables (Phases 3–6)

Payments, organizations, full admin panel, report revisions, AI usage cost tables.

## RLS

Phase 1 policies:

- Users read/update own profile
- Super admins manage roles and plans
- Public read of active subscription plans only
