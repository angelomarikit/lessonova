# Architecture

## High-level

```mermaid
flowchart LR
  subgraph client [Browser]
    Marketing[Marketing site]
    Dashboard[Teacher dashboard]
    Admin[Super admin]
  end

  subgraph vercel [Vercel]
    Next[Next.js App Router]
    API[Route handlers / server actions]
  end

  subgraph supabase [Supabase]
    Auth[Auth]
    DB[(PostgreSQL + RLS)]
    Storage[Private storage]
    Edge[Edge Functions]
  end

  subgraph workers [Background processing]
    Jobs[Processing jobs queue]
  end

  subgraph ai [External AI]
    DeepInfra[DeepInfra Whisper]
    Deepgram[Deepgram fallback]
    Claude[Anthropic Claude]
  end

  Marketing --> Next
  Dashboard --> Next
  Admin --> Next
  Next --> Auth
  Next --> DB
  Next --> Storage
  API --> Jobs
  Jobs --> DeepInfra
  Jobs --> Deepgram
  Jobs --> Claude
```

## Security principles

- No provider secrets in client bundles
- RBAC enforced in Postgres RLS + server routes
- Super admin role assigned only by existing super admins
- Private recordings and payment proofs in private buckets with signed URLs
- Long-running transcription/analysis outside synchronous Vercel request lifecycle

## Module boundaries (target)

- `src/app/(marketing)` — public site
- `src/app/dashboard` — tutor workspace
- `src/app/admin` — platform administration
- `src/lib/supabase` — auth/data clients
- `supabase/migrations` — schema source of truth
