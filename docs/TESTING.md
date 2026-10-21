# Testing

## Phase 1 manual checks

- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] Home page renders all sections on mobile and desktop
- [ ] Logo appears in header/footer/auth
- [ ] Pricing cards render from Supabase when configured, otherwise fallback copy
- [ ] Register/login flows work after Supabase migration + env vars
- [ ] Google OAuth redirects to `/auth/callback`
- [ ] Dashboard redirects unauthenticated users to `/login`

## Future automated coverage

- Auth and RBAC integration tests
- RLS policy tests (Supabase local)
- Payment verification state machine
- Processing job idempotency and credit restoration
