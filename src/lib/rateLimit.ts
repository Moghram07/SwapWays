type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const fallbackGlobalState = globalThis as unknown as {
  __swapWaysRateLimitStore?: Map<string, RateLimitEntry>;
};

function getFallbackStore(): Map<string, RateLimitEntry> {
  if (!fallbackGlobalState.__swapWaysRateLimitStore) {
    fallbackGlobalState.__swapWaysRateLimitStore = new Map<string, RateLimitEntry>();
  }
  return fallbackGlobalState.__swapWaysRateLimitStore;
}

function hasRedisConfig() {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function consumeFallback(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const store = getFallbackStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: Math.ceil(windowMs / 1000), source: "memory" as const };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
      source: "memory" as const,
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return {
    allowed: true,
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    source: "memory" as const,
  };
}

async function consumeRedis(key: string, limit: number, windowSec: number) {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const headers = { Authorization: `Bearer ${token}` };

  const incrRes = await fetch(`${baseUrl}/incr/${encodeURIComponent(key)}`, { method: "POST", headers });
  if (!incrRes.ok) throw new Error("Redis INCR failed");
  const incrJson = (await incrRes.json()) as { result?: number | string };
  const current = Number(incrJson.result ?? 0);

  if (current === 1) {
    await fetch(`${baseUrl}/expire/${encodeURIComponent(key)}/${windowSec}`, { method: "POST", headers }).catch(
      () => {}
    );
  }

  const ttlRes = await fetch(`${baseUrl}/ttl/${encodeURIComponent(key)}`, { method: "GET", headers });
  const ttlJson = ttlRes.ok ? ((await ttlRes.json()) as { result?: number | string }) : { result: windowSec };
  const ttl = Math.max(1, Number(ttlJson.result ?? windowSec));

  return {
    allowed: current <= limit,
    retryAfterSec: ttl,
    source: "redis" as const,
  };
}

export async function consumeRateLimit(input: {
  namespace: string;
  key: string;
  limit: number;
  windowMs: number;
}) {
  const compositeKey = `${input.namespace}:${input.key}`;
  if (hasRedisConfig()) {
    try {
      return await consumeRedis(compositeKey, input.limit, Math.ceil(input.windowMs / 1000));
    } catch {
      return consumeFallback(compositeKey, input.limit, input.windowMs);
    }
  }
  return consumeFallback(compositeKey, input.limit, input.windowMs);
}

