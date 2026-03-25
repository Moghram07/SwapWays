# Swap Ways

**www.swapways.com** — Trip and vacation swap matching for airline crew (Phase 1: Saudia Airlines).

## Stack

- **Next.js 14+** (App Router), **TypeScript**, **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **NextAuth.js** (credentials + JWT)
- **Zustand** (state)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`
   - Set `DATABASE_URL` (PostgreSQL). If you use **Supabase** (or any host that closes idle connections), use the **pooled** connection URL (e.g. Supabase: Session pooler, port **6543**) and add `?connection_limit=10` to avoid "connection forcibly closed by the remote host" errors (e.g. after canceling a swap).
   - Set `NEXTAUTH_URL` (e.g. `http://localhost:3000`) and `NEXTAUTH_SECRET`

3. **Database**
   ```bash
   npx prisma db push
   npm run db:seed
   ```
   Optional: set `SEED_TEST_USER=true` in `.env.local` before seeding to create `test@saudia.com` / `Test123!`

4. **Run**
   ```bash
   npm run dev
   ```

## Testing without a @saudia.com email

You can test the app in two ways:

1. **Use the seeded test user**  
   In `.env.local` set `SEED_TEST_USER=true`, then run `npm run db:seed`.  
   Log in with **test@saudia.com** / **Test123!** (no real inbox needed).

2. **Register with your own email**  
   When running locally (`npm run dev`), the app is in development mode and **any email** can register (e.g. your Gmail). Choose Saudia, fill the form with your real email and a password, then log in.  
   For production, only emails matching the airline domain (e.g. @saudia.com) are allowed unless you set `ALLOW_ANY_EMAIL_FOR_TESTING=true` (not recommended in production).

## Check database connection

- **From the app:** run `npm run dev`, then open **http://localhost:3000/api/health**. You should see `{ "ok": true, "database": "connected" }`.
- If you see `database: "disconnected"`, check `DATABASE_URL` in `.env.local` (and that Prisma loads it; see `prisma.config.ts`).

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start dev server         |
| `npm run build`| Production build         |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push`     | Push schema to DB       |
| `npm run db:seed`     | Seed Saudia data        |
| `npm run db:studio`   | Open Prisma Studio     |

## Phase 1 (MVP)

- Saudia Airlines only
- Manual trip entry
- Basic matching (same base, rank, qualifications)
- Browse trades, my trades, matches, profile

## Project layout

- `src/app` — App Router pages and API routes
- `src/components` — UI (auth, profile, trade, match, layout)
- `src/services` — Matching engine, validators, trade logic
- `src/repositories` — Prisma (DB access only)
- `src/types` — TypeScript interfaces
- `src/config/airlines` — Saudia (and future airline) config

## Production (www.swapways.com)

Set in your host (e.g. Vercel) environment:

- `NEXTAUTH_URL=https://www.swapways.com`
- `DATABASE_URL` = your Supabase (or other) connection string
- `NEXTAUTH_SECRET` = a long random secret
- `MATCH_REFRESH_SECRET` = long random secret used by refresh endpoint

## Launch and Operations Docs

- Release gates: `docs/launch/RELEASE_PIPELINE_AND_GATES.md`
- Beta checklist: `docs/launch/BETA_TO_10K_CHECKLIST.md`
- Beta rollout playbook: `docs/launch/BETA_ROLLOUT_PLAYBOOK.md`
- Observability and release gates: `docs/launch/OBSERVABILITY_AND_RELEASE_GATES.md`
- Alert ownership and thresholds: `docs/ops/OBSERVABILITY_ALERTS_AND_OWNERS.md`
- Mobile QA matrix: `docs/qa/MOBILE_BETA_TEST_MATRIX.md`
- Load testing plan: `docs/load/PROGRESSIVE_LOAD_TESTING.md`
- Security readiness: `docs/security/PRODUCTION_SECURITY_READINESS.md`
