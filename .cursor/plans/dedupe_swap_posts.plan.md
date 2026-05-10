# Dedupe swap posts + multi-stop route display

## Confirmed from your screenshot

- Both cards are **Quick post** with **Multi-Stop** and identical offer text **`SV · JED + GIZ + GIZ + JED + JED + BHH + BHH + JED`** (same “Willing to fly” / FOR side). That matches a **manual** offer path: offered trips have **`scheduleTripId: null`**, so the existing duplicate guard in [`POST /api/swap-posts`](src/app/api/swap-posts/route.ts) (only when `selectedTrips.length > 0`) **never runs**.
- **Display:** Multi-stop is built today as `destinationCodes.join(" + ")` in [`TradeBoardCard.tsx`](src/components/swap-post/TradeBoardCard.tsx) (`OfferingTripRow`), which reads like a flat list, not a sequence of legs.

## Part A — Block duplicate OPEN offers (same user)

**Goal:** Same semantics as today for schedule picks: if **any** offered trip in the new payload already appears on **another OPEN** post by this user, reject (HTTP 400) with a clear message.

**Scope:**

1. **Fingerprint helper** for trips with `scheduleTripId == null`: normalized UTC date + `tripType` + normalized report time + ordered `destinations` (and `flightNumber` when present) so two Quick posts like yours collide.
2. **Repository/helper:** load user’s OPEN posts + `offeredTrips`, detect overlap; support **`excludeSwapPostId`** for [`PATCH /api/swap-posts/[id]`](src/app/api/swap-posts/[id]/route.ts).
3. Run check **after** `swapPostTrips` is built, **before** create/update. Optionally consolidate with the existing `scheduleTripId` `findFirst` or keep both paths calling one function.
4. **Tests:** second identical Quick POST fails; PATCH edge cases.
5. **Optional:** disable submit while request in flight on create flow to reduce double-submit (server remains source of truth; small race window can remain unless you add a stricter DB strategy later).

**Note:** Two *different* users posting the same route remains allowed unless you explicitly want global dedupe (not in this plan).

## Part B — Multi-stop offer line: arrows between legs

**Goal:** Replace flat `A + B + C + …` for **MULTI_STOP** with a **leg chain**:  
`A → B + B → C + …` (Unicode arrow `→`, segments separated by ` + `) — matching your example  
`JED → GIZ + GIZ → JED + JED → BHH + BHH → JED`.

**Implementation:**

1. Small shared helper, e.g. **`formatMultiStopAirportChain(codes: string[])`** in `src/utils/` (or next to trip display):
   - If `codes.length < 2`, fall back to single code or `join(" → ")` as appropriate.
   - Else: `codes.slice(0, -1).map((from, i) => \`${from} → ${codes[i + 1]}\`).join(" + ")`.
   - Normalize to uppercase for display consistency if needed.

2. **Prefer real leg order when available:** In [`OfferingTripRow`](src/components/swap-post/TradeBoardCard.tsx), if `trip.legs` exists and has depart/arrive airports, build segments as **`dep → arr` per leg** then join with ` + ` (handles base/origin correctly vs destination-only arrays). If no legs (pure Quick payload), use ordered `destinations` with the pairwise helper above.

3. **Replace** the MULTI_STOP branch that currently does `destinationCodes.join(" + ")`.

4. **Consistency pass (same product language):** Apply the same helper where multi-stop is shown with `join(" + ")` on airport codes, e.g. [`TripCardHeader.tsx`](src/components/trip/TripCardHeader.tsx), [`SwapModal.tsx`](src/components/swap/SwapModal.tsx), and optionally [`TripSelector.tsx`](src/components/swap-post/TripSelector.tsx) / calendar copy — scope can be “board + trip cards first” if you want a smaller first PR.

5. **i18n:** Arrow and `+` are universal; no copy change required unless you later localize “Report:”.

## Existing duplicates in DB

Deploy does not remove historical duplicate OPEN rows; cancel/delete or a one-off cleanup script if needed.

## Execution order

1. Part A (API dedupe + tests) — fixes the double Quick post issue.  
2. Part B (display) — improves readability without changing matching logic.
