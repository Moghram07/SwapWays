# Launch Readiness Checklist Dashboard

Use this page as the single source of truth for launch sign-off.

## Release Metadata
- Release version:
- Commit SHA:
- Target environment: `staging` / `production`
- Release date:
- Release lead:

## Overall Status
| Area | Status (`Not Started` / `In Progress` / `Blocked` / `Done`) | Owner | Sign-off date | Notes |
|---|---|---|---|---|
| Release gates |  |  |  |  |
| Mobile QA |  |  |  |  |
| Security readiness |  |  |  |  |
| Observability and alerts |  |  |  |  |
| Load testing and capacity |  |  |  |  |
| Beta rollout readiness |  |  |  |  |

## Gate-by-Gate Sign-off

| Gate | Required command(s) | Owner | Sign-off date | Evidence / Link |
|---|---|---|---|---|
| CI quality gate | `npm run ci:gate` | Engineering |  | [CI workflow](../../.github/workflows/ci.yml) |
| Staging release gate | GitHub Action: `Release Gates` (`target_environment=staging`) | Release lead |  | [Release gate workflow](../../.github/workflows/release-gates.yml) |
| Production release gate | GitHub Action: `Release Gates` (`target_environment=production`) | Release lead |  | [Release gate workflow](../../.github/workflows/release-gates.yml) |
| Migration status check | `npm run db:migrate:status` | Backend |  | [Release pipeline doc](RELEASE_PIPELINE_AND_GATES.md) |
| Migration deploy (if needed) | `npm run db:migrate:deploy` | Backend |  | [Release pipeline doc](RELEASE_PIPELINE_AND_GATES.md) |
| Mobile QA matrix | Manual execution of test matrix | QA lead |  | [Mobile test matrix](../qa/MOBILE_BETA_TEST_MATRIX.md) |
| Mobile QA report | Fill beta report template | QA lead |  | [Report template](../qa/MOBILE_BETA_REPORT_TEMPLATE.md) |
| Security readiness check | Manual checklist review | Security owner |  | [Security readiness](../security/PRODUCTION_SECURITY_READINESS.md) |
| Alert rules configured | Manual alert setup in monitoring platform | Platform/SRE |  | [Alert owners and thresholds](../ops/OBSERVABILITY_ALERTS_AND_OWNERS.md), [Example rules](../ops/alert-rules.example.yml) |
| Telemetry event validation | Verify events and schema consistency | Backend + Analytics |  | [Telemetry catalog](../ops/TELEMETRY_EVENT_CATALOG.md) |
| Smoke load test | `npm run load:smoke` | Performance owner |  | [Load testing guide](../load/PROGRESSIVE_LOAD_TESTING.md) |
| Staged load test | `npm run load:staged` | Performance owner |  | [Load testing guide](../load/PROGRESSIVE_LOAD_TESTING.md) |
| Beta rollout playbook readiness | Manual run-through + on-call confirmation | Product + Engineering |  | [Beta rollout playbook](BETA_ROLLOUT_PLAYBOOK.md) |

## Go / No-Go Decision
- Decision: `GO` / `NO-GO`
- Decision timestamp:
- Decision makers:
  - Product:
  - Engineering:
  - QA:
  - Platform/SRE:
- Blocking reasons (if `NO-GO`):

## Post-Launch 60-Minute Monitoring Log
| Time (UTC) | API 5xx | API p95 | DB connection use | Incidents | Owner initials |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |
|  |  |  |  |  |  |

## Related Documents
- [Release pipeline and gates](RELEASE_PIPELINE_AND_GATES.md)
- [Beta to 10k checklist](BETA_TO_10K_CHECKLIST.md)
- [Observability and release gates](OBSERVABILITY_AND_RELEASE_GATES.md)
- [Beta rollout playbook](BETA_ROLLOUT_PLAYBOOK.md)
- [Mobile QA matrix](../qa/MOBILE_BETA_TEST_MATRIX.md)
- [Security readiness](../security/PRODUCTION_SECURITY_READINESS.md)
- [Load testing](../load/PROGRESSIVE_LOAD_TESTING.md)
- [Observability alerts and owners](../ops/OBSERVABILITY_ALERTS_AND_OWNERS.md)
