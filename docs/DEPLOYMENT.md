# Deployment (Vercel)

## Environments

Configure the same variable names in Development, Preview, and Production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_APP_URL`

Add AI and email keys in later phases.

## Steps

1. Push repository to GitHub (or connect local repo).
2. Import project in Vercel.
3. Set environment variables.
4. Deploy `main` to production; PRs to preview.
5. In Supabase, add Vercel preview/production URLs to Auth redirect allow list.

## Supabase Auth redirects

Include:

- `https://<your-domain>/auth/callback`
- `http://localhost:3000/auth/callback`

## Background jobs

Do not run full lesson transcription inside a standard serverless timeout. Phase 3 will use durable job processing (Supabase Edge Functions + queue/table-driven workers or an approved job runner).
