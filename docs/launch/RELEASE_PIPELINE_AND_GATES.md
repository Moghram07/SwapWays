# Release Pipeline and Gates

## Branch Rules
- `main` is the only production source branch.
- Every PR must pass CI checks: lint, test, build.
- No direct production deploy without passing staging gate.

## CI Gate (Automatic)
- Workflow: `.github/workflows/ci.yml`
- Trigger: pull requests, pushes to `main`, manual dispatch.
- Checks:
  - Prisma schema validate + generate
  - ESLint
  - Vitest
  - Next.js production build

## Staging / Production Release Gate (Manual)
- Workflow: `.github/workflows/release-gates.yml`
- Trigger: manual dispatch.
- Inputs:
  - `target_environment`: `staging` or `production`
  - `run_migrations`: `true` or `false`
- Required env vars from GitHub Environment secrets/vars:
  - `DATABASE_URL` (secret)
  - `NEXTAUTH_SECRET` (secret)
  - `NEXTAUTH_URL` (variable)
  - `MATCH_REFRESH_SECRET` (secret)
  - `ADMIN_EMAIL` (variable)

## Required Deploy Sequence
1. Merge approved PR to `main` after CI is green.
2. Run release gate workflow for `staging` with migrations enabled.
3. Validate staging smoke tests and API health.
4. Run release gate workflow for `production`.
5. Announce release and monitor errors/latency for 60 minutes.

## Rollback Rule
- If post-release error budget is exceeded:
  1. Roll back app deployment to last stable build.
  2. Disable non-critical traffic via feature flags/kill switches.
  3. Investigate migration compatibility before re-release.
