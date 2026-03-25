# Production Security Readiness

## Configuration Controls
- `ALLOW_ANY_EMAIL_FOR_TESTING` must be unset or `false` in production.
- `NEXTAUTH_SECRET` must be present and at least 32 characters.
- `MATCH_REFRESH_SECRET` must be present and at least 32 characters.
- `ADMIN_EMAIL` must be explicitly reviewed before each release.
- Separate secrets per environment (`dev`, `staging`, `production`).

## Auth / Access Control Checks
- Validate admin-only routes enforce `isAdmin` server-side:
  - `/api/admin/*`
  - `/dashboard/admin`
- Validate all write endpoints require authenticated user where applicable.
- Confirm sensitive endpoints do not leak stack traces in API responses.

## API Hardening
- Security headers enforced in proxy:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`, `COOP`, `CORP`, `HSTS`
- Rate limits enabled for:
  - Global API traffic
  - Register/login
  - Match refresh job
  - Feedback writes
  - Message writes

## Data and Secrets
- Never commit `.env*` with real secrets.
- Use pooled DB URL with connection limit in production.
- Confirm backups and point-in-time recovery are enabled on production DB.

## Security Validation Before Release
1. Run CI + release gates (`lint`, `test`, `build`, migration checks).
2. Verify auth/register/login abuse limits (429 responses) in staging.
3. Verify admin access control with:
   - non-admin user
   - admin user
4. Verify `/api/health` remains sanitized on DB failures.
5. Record sign-off owner and date.
