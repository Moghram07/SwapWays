-- Launch-scale indexes for mobile-heavy traffic.
-- Safe to run in PostgreSQL production before full launch.

CREATE INDEX IF NOT EXISTS "Trade_userId_status_createdAt_idx"
  ON "Trade"("userId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Trade_tradeType_status_departureDate_idx"
  ON "Trade"("tradeType", "status", "departureDate");

CREATE INDEX IF NOT EXISTS "Trade_status_departureDate_idx"
  ON "Trade"("status", "departureDate");

CREATE INDEX IF NOT EXISTS "Trade_userId_tradeType_status_idx"
  ON "Trade"("userId", "tradeType", "status");

CREATE INDEX IF NOT EXISTS "Conversation_initiatorId_lastMessageAt_idx"
  ON "Conversation"("initiatorId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Conversation_tradeOwnerId_lastMessageAt_idx"
  ON "Conversation"("tradeOwnerId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Conversation_postOwnerId_lastMessageAt_idx"
  ON "Conversation"("postOwnerId", "lastMessageAt");

CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_createdAt_idx"
  ON "Notification"("userId", "isRead", "createdAt");
