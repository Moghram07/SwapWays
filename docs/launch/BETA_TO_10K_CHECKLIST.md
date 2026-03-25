# Beta to 10k Launch Checklist

## Hosting Target
- Platform: Vercel (beta + initial production).
- Database: managed PostgreSQL with pooling enabled.
- Environments: `dev`, `staging`, `production`.

## Environment Separation
- Use separate projects and separate DBs per environment.
- Use different `NEXTAUTH_SECRET` and `MATCH_REFRESH_SECRET` values per environment.
- Keep `ALLOW_ANY_EMAIL_FOR_TESTING` unset in production.
- Keep admin bootstrap (`ADMIN_EMAIL`) explicit and reviewed.

## Deployment Pipeline
- CI gate on every PR: lint, test, build.
- Pre-deploy on staging: run `prisma migrate deploy`.
- Production deployment only from `main` after staging validation.
- Rollback rule: revert to last known good deployment and keep migration plan ready.

## Security Go-Live Requirements
- Authz checks in high-risk API routes verified.
- Rate limiting active for auth and write-heavy APIs.
- Security headers present in production responses.
- Production env validation blocks startup on missing critical secrets.
- Health endpoint does not leak stack traces or internal details.

## Scale and Performance Requirements
- Message polling reduced and visibility-aware.
- Unread polling reduced and visibility-aware.
- Browse queries paginated at DB level.
- Indexes in place for status, user, date, and base/airline filters.
- Mobile flows tested on low-end devices and poor network profiles.

## Observability Requirements
- Error tracking enabled in production.
- API latency metrics collected (`p50`, `p95`, `p99`).
- DB metrics tracked (connections, slow queries, CPU, memory).
- Alerting in place for 5xx spikes and high latency.
- Incident runbook and contact rotation documented.

## Release Gates
### Beta gate
- No critical security issues open.
- Staging smoke tests green.
- p95 API latency within target under beta load.

### Full launch (10k) gate
- Load test executed at target and 20% headroom.
- DB connection and query latency stable under load.
- Crash-free sessions and error budget within thresholds.
- On-call and rollback drills completed.
