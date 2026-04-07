export function isQuickPostEnabledForUser(userId: string | null | undefined): boolean {
  const rolloutRaw = process.env.NEXT_PUBLIC_QUICK_POST_ROLLOUT_PERCENT ?? "100";
  const rollout = Number(rolloutRaw);
  if (!Number.isFinite(rollout) || rollout <= 0) return false;
  if (rollout >= 100) return true;
  const id = userId ?? "";
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const bucket = hash % 100;
  return bucket < rollout;
}

