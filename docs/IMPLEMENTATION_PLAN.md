# Lessonova Implementation Plan

## Inspection summary (2026-03-21)

| Area | Finding |
| --- | --- |
| Local repo | Greenfield Next.js app scaffolded in `lessonova/` |
| Logo | `public/lessonova-logo.png` (uploaded asset preserved) |
| Framer Brief | Connected project **Brief - AI SaaS Template (copy)**; fonts **Inter** + **Manrope**; Brief-style green SaaS layout |
| Benchmark | [BumbleNote](https://bumblenote.com/) functional reference |
| Backend | Supabase (not Neon) |
| Hosting | Vercel (not Netlify) |
| Payments Phase 1 | Manual GCash + QR Ph (not PayMongo / Stripe) |

## Phase 1 — Design and foundation (current)

**Goal:** Responsive marketing site + auth foundation + admin-managed pricing model.

Deliverables:

- [x] Next.js 16 + React 19 + Tailwind CSS v4 app scaffold
- [x] Lessonova design tokens (Brief-aligned greens, typography)
- [x] Public website sections (hero, features, how-it-works, demo, pricing, FAQ, footer)
- [x] Logo usage sitewide
- [x] Supabase client/server/middleware wiring
- [x] Phase 1 SQL migration (`profiles`, `user_roles`, `subscription_plans`, trial credits)
- [x] Auth UI (email/password, Google OAuth hook, forgot password)
- [x] Dashboard shell (Phase 2 modules labeled)
- [ ] Supabase project linked + migration applied in your cloud project
- [ ] Google OAuth provider configured in Supabase
- [ ] Vercel project + environment variables

## Phase 2 — Core tutor system

Students CRUD, profiles, lesson list placeholders, RLS for tenant data, real dashboard metrics.

## Phase 3 — Recording and AI

Consent, upload/recording, DeepInfra + Deepgram pipeline, Claude analysis jobs (durable workers, not long Vercel requests).

## Phase 4 — Reports and progress

PDF reports, Resend email, editable AI output, grammar/vocabulary history.

## Phase 5 — Subscriptions and manual payments

GCash/QR Ph admin settings, proof upload, verification queue, credit allocation.

## Phase 6 — Admin and schools

`/admin` super panel, school org model, invitations, analytics.

## Phase 7 — QA and production readiness

Automated tests, security review, performance tuning, deployment checklist.

## Blocked without credentials

These integrations are stubbed/documented until keys exist:

- DeepInfra / Deepgram / Anthropic (Phase 3)
- Resend (Phase 4)
- PayMongo (future phase)
