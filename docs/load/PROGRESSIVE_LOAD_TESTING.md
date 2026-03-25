# Progressive Load Testing

## Goal
Determine safe concurrent-user capacity and scale thresholds for beta rollout decisions.

## Scripts
- Smoke test: `npm run load:smoke`
- Staged load test: `npm run load:staged`

Both scripts default to `http://localhost:3000`. Override with:

```bash
BASE_URL=https://staging.swapways.com npm run load:staged
```

## Staged Test Sequence
1. Ramp 10 -> 50 VUs (2 minutes)
2. Ramp 50 -> 120 VUs (3 minutes)
3. Ramp 120 -> 200 VUs (2 minutes)
4. Spike probe to 300 VUs (1 minute), recover to 80 VUs

## Pass/Fail Thresholds
- `http_req_failed < 2%`
- `http_req_duration p95 < 1500ms`
- `http_req_duration p99 < 2500ms`
- Health endpoint p95 under 500ms

## Capacity Decision Policy
- If thresholds pass for 48h after deploy, increase cohort by next step.
- If thresholds fail:
  - pause cohort expansion,
  - identify top slow/failing routes,
  - apply fixes and re-run staged test.

## Suggested Cohort Expansion
- Step 1: 50 users
- Step 2: 200 users
- Step 3: 1,000 users
- Step 4: 3,000 users
- Step 5: 10,000 users (only after +20% headroom test passes)

## Report Template
Capture these values after each test run:
- timestamp and commit SHA
- peak VUs reached
- error rate
- p95/p99 latency
- top 5 slow routes
- DB CPU/connections at peak
- recommendation (`GO` / `NO-GO`)
