/**
 * Trade board: when `includeLowMatches` is false, drop cards with match % **below** this value.
 *
 * Set to **0** during early growth so Swaps lists every scored post.
 * Raise to **30–40** when the board is noisy at scale.
 */
export const TRADE_BOARD_DEFAULT_MIN_MATCH_PERCENT = 0;

/**
 * Matches feed (`findHighAffinityPostsForUser`) and dashboard “top matches” preview —
 * quality floor so recommendations stay actionable (independent of the board).
 */
export const MATCHES_FEED_MIN_MATCH_PERCENT = 40;
