/**
 * Short-lived in-memory cache for the conversation detail payload
 * (`GET /api/conversations/[id]`). Keyed per viewer so each participant gets
 * their own mapped trip views.
 *
 * Any route that mutates a conversation (offered trip, proposal status,
 * deletion) MUST call `invalidateConversationCache(id)` so the next fetch
 * reflects the change immediately instead of serving a stale entry.
 */
const CONVERSATION_CACHE_TTL_MS = 15_000;

type Entry = { expiresAt: number; payload: unknown };
const conversationCache = new Map<string, Entry>();

function cacheKey(userId: string, conversationId: string): string {
  return `${userId}:${conversationId}`;
}

export function getCachedConversation(userId: string, conversationId: string): unknown | null {
  const entry = conversationCache.get(cacheKey(userId, conversationId));
  if (entry && entry.expiresAt > Date.now()) return entry.payload;
  return null;
}

export function setCachedConversation(userId: string, conversationId: string, payload: unknown): void {
  conversationCache.set(cacheKey(userId, conversationId), {
    expiresAt: Date.now() + CONVERSATION_CACHE_TTL_MS,
    payload,
  });
}

/** Drop every viewer's cached payload for a conversation (cuids never contain ":"). */
export function invalidateConversationCache(conversationId: string): void {
  const suffix = `:${conversationId}`;
  for (const key of conversationCache.keys()) {
    if (key.endsWith(suffix)) conversationCache.delete(key);
  }
}
