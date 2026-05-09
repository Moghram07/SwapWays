# Match Engine v2 Deploy Runbook

## Before deploy

- [ ] All tests passing (`npx vitest run`, `npx tsc --noEmit`)
- [ ] Benchmark passes (`npx vitest run __tests__/matching/perfBench.test.ts` — under 2s average for 50 scoring calls)
- [ ] Tag current main for rollback: `git tag pre-match-engine-v2 && git push --tags`

## At deploy

- [ ] Push to main, wait for Vercel deploy
- [ ] On production DB, clear stale match cache (one-time after v2):

```ts
await prisma.matchCache.deleteMany({});
```

Use Supabase SQL editor, Prisma Studio, or a one-off script with `DATABASE_URL` pointed at production.

## After deploy (first 30 min)

- [ ] Check Vercel logs for errors
- [ ] Open Trade Board as a test user — cards should show numeric `%` badges where score &gt; 0
- [ ] Open Matches — first load may take several seconds (cold cache + scoring)

## Monitor (48 hours)

- [ ] Note feedback on empty Matches or unexpectedly low %
- [ ] Spot-check a few users if possible — percentages should align with expectations (WTF hard gate, schedule conflict, overlap scoring)

## Rollback

If issues:

```bash
git revert <new-commit-hash>
git push
```

Restore DB only if necessary; cache will repopulate on its own.
