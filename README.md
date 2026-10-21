# Lessonova

AI-powered ESL teaching assistant SaaS for Filipino online English teachers and language schools.

## Stack

- Next.js App Router (React, TypeScript)
- Tailwind CSS v4
- Supabase (Auth, PostgreSQL, Storage, RLS)
- Vercel deployment target

## Local development

1. Copy `.env.example` to `.env.local` and add your Supabase project values.
2. Install dependencies:

```bash
npm install
```

3. Apply Supabase migrations from `supabase/migrations/` using the Supabase CLI or dashboard SQL editor.
4. Enable Google OAuth in Supabase if you want Google sign-in.
5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Phase status

- **Phase 1 (in progress):** marketing website, design system, Supabase foundation schema, auth screens, dashboard shell
- **Phase 2+:** tutor workspace, recording, AI pipeline, billing, admin panel (see `docs/IMPLEMENTATION_PLAN.md`)

## Design reference

- Framer Brief template (connected Framer project)
- Brand logo: `public/lessonova-logo.png`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
