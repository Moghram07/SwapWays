# Observability Alerts and Owners

## Required Dashboards

### 1) API Reliability Dashboard
- Metrics:
  - Request count by route group
  - `p50`, `p95`, `p99` latency by route
  - `4xx` and `5xx` rate
- Time windows:
  - Last 15 minutes (incident triage)
  - Last 24 hours (trend)

### 2) Database Health Dashboard
- Metrics:
  - CPU and memory
  - Active connections vs pool limit
  - Slow query count
  - Deadlocks / lock wait time

### 3) Client Health Dashboard
- Metrics:
  - Crash-free sessions
  - Unhandled runtime errors (mobile browser focus)
  - Session duration and bounce rate for onboarding routes

## Minimum Alert Rules
| Alert | Threshold | Window | Severity | Owner |
|---|---|---|---|---|
| API 5xx spike | `> 2%` | 5m | P1 | Backend on-call |
| API latency high | `p95 > 1500ms` | 10m | P1 | Backend on-call |
| DB saturation | `connections > 80%` | 5m | P1 | Platform on-call |
| Auth failures spike | 3x baseline | 10m | P2 | Backend on-call |
| Client runtime errors | 2x baseline | 30m | P2 | Frontend on-call |

## Ownership Model
- Primary owner: Engineering on-call.
- Secondary owner: Product owner for user-impact decisions.
- Escalation owner: Platform/DB owner when DB pressure is root cause.

## Response SLAs
- P1 acknowledgement: under 10 minutes.
- P2 acknowledgement: under 30 minutes.
- Public/internal status update cadence during incident: every 30 minutes.

## Post-incident Requirements
1. Timeline and root cause.
2. Containment and corrective actions.
3. Preventive action items with owner and due date.
4. Postmortem published within 24 hours for P1 incidents.
