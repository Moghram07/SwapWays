# Saudia Private Beta Rollout Playbook

## Scope
- Product scope: Saudia airline users only.
- Rollout method: invite-only cohorts.
- Success criteria: stable reliability, mobile UX quality, and positive support outcomes.

## Roles
- Release lead: coordinates go/no-go and deployment.
- On-call engineer: monitors alerts and triages incidents.
- Product owner: approves cohort expansion.
- Support owner: collects and routes beta user feedback.

## Cohort Plan
| Cohort | Target Users | Duration | Entry Criteria | Exit Criteria |
|---|---|---|---|---|
| C1 | 50 | 5-7 days | Release gates green | p95 and error rate within targets, no P0 |
| C2 | 200 | 7 days | C1 stable 48h | No unresolved P0/P1, support queue manageable |
| C3 | 1,000 | 7-10 days | C2 stable 48h | Load tests pass and DB headroom confirmed |
| C4 | 3,000+ | 10-14 days | C3 stable 72h | +20% headroom test passes |

## Pre-Launch Checklist (Per Cohort)
1. CI and release gates pass.
2. Migration status is clean.
3. Mobile beta matrix completed and signed off.
4. Alert channels verified and on-call assigned.
5. Rollback deployment target confirmed.

## Launch Day Procedure
1. Announce launch window internally.
2. Deploy release candidate.
3. Run smoke checks:
   - `/api/health`
   - login/register
   - schedule upload
   - trade board
   - messages
4. Start cohort invite distribution.
5. Monitor 60 minutes continuously after launch.

## Monitoring During Beta
- Every 30 minutes check:
  - API 5xx rate
  - p95 API latency
  - DB connection utilization
  - Auth failure spikes
- Every day review:
  - top support complaints
  - top failing routes
  - mobile-specific UX defects

## Rollback Triggers
- 5xx error rate above 2% for 5+ minutes.
- p95 latency above 1500ms for 10+ minutes.
- login or core flow outage for more than 10 minutes.
- critical security issue identified.

## Rollback Procedure
1. Pause new invites immediately.
2. Roll back to last known stable deployment.
3. Disable non-critical features if needed.
4. Publish status update to internal stakeholders.
5. Create incident record and remediation plan.

## Communications Templates

### Internal Launch Start
`Swap Ways beta cohort Cx is now live. Monitoring window: <time range>. On-call: <name>.`

### Internal Incident Update
`Beta incident detected: <summary>. Impact: <scope>. Mitigation in progress. Next update in 30 minutes.`

### Cohort Expansion Approval
`Cohort Cx met launch gates. Approved to proceed to Cx+1 with target user count <N>.`
