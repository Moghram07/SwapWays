# Mobile Beta Test Matrix

## Objective
Validate critical crew flows on real mobile devices and degraded network conditions before each beta cohort increase.

## Required Test Environments
- Devices:
  - iPhone 12/13 (iOS latest stable)
  - iPhone SE (small screen stress test)
  - Android mid-range device (e.g. Samsung A-series)
  - Android flagship (latest Chrome baseline)
- Browsers:
  - Safari iOS
  - Chrome Android
  - Samsung Internet (if available)
- Networks:
  - Wi-Fi (baseline)
  - 4G throttled
  - 3G throttled / high-latency profile

## Release-Critical Journeys
Mark each flow pass/fail per device + network profile.

| Area | Flow | Pass Criteria |
|---|---|---|
| Auth | Register -> Login -> Dashboard | No blocking errors, no layout overlap, response under 3s on 4G |
| Schedule | Upload schedule PDF -> view trips/calendar | Upload completes, trips appear correctly, no crash |
| Trade Board | Create post -> browse board -> filters | Cards readable on small screens, filter state consistent |
| Matching | Open matches -> view details | Match list loads without errors, detail view responsive |
| Messaging | Open conversation -> send message | Message sends once, appears in thread, no duplicate send |
| Profile | Update profile and qualifications | Save succeeds and persists after refresh |
| Admin (internal) | Open admin inbox and stats | Both tabs load with no console errors |

## UX and Performance Checks
- Touch targets are at least 44x44 px for key actions.
- No horizontal overflow on 320px width.
- LCP target under 3.0s on 4G for login and dashboard.
- API p95 under 1500ms during beta test windows.
- Loading and error states visible for all async screens.

## Accessibility Baseline
- Keyboard/tab order works for auth and primary forms.
- Sufficient text contrast on mobile screens.
- Form fields have labels; validation messages are clear.

## Defect Severity Rules
- `P0`: blocks login, posting, messaging, or schedule upload -> stop rollout.
- `P1`: major mobile usability issue on top 2 device classes -> fix before next cohort.
- `P2`: non-blocking visual/perf issue -> schedule in next sprint.

## Sign-Off Template (Per Cohort)
- Cohort size:
- Date range:
- Devices covered:
- Networks covered:
- P0 count:
- P1 count:
- Decision: `GO` / `NO-GO`
- Approvers: Product, Engineering, QA
