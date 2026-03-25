# Observability and Release Gates

## Required Telemetry
- Request volume, latency (`p50`, `p95`, `p99`) per API route.
- API error rate (`4xx`, `5xx`) per route group.
- Database metrics: CPU, memory, active connections, slow query count.
- Client crash and unhandled runtime errors in mobile browsers.

## Minimum Alert Set
- `5xx rate > 2%` for 5 minutes.
- `p95 API latency > 1500ms` for 10 minutes.
- `DB connections > 80%` of pool limit for 5 minutes.
- Repeated auth/register failure spikes.

## Incident Runbook
1. Acknowledge alert and classify severity.
2. Check deploy history and recent schema changes.
3. Roll back app deployment if spike started after release.
4. If DB pressure: reduce expensive traffic and scale DB tier/pool.
5. Publish status update and postmortem within 24 hours.

## Beta Go / No-Go Gates
- No critical security issues open.
- Lint/test/build green on release candidate.
- Key mobile flows validated on slow network profile.
- p95 latency and error budgets within target for 48 hours in staging/beta.

## Full Launch (10k) Go / No-Go Gates
- Load test at expected peak and +20% headroom.
- DB resource usage stable at peak with clear safety margin.
- On-call coverage confirmed during launch window.
- Rollback plan tested and documented.
