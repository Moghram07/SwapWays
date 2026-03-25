// Re-export Prisma enums for use in application code

export type CrewCategory = "CABIN" | "FLIGHT_DECK";
export type TradeType = "FLIGHT_SWAP" | "VACATION_SWAP";
export type TradeStatus =
  | "OPEN"
  | "MATCHED"
  | "ACCEPTED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";
export type MatchStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type NotificationType =
  | "MATCH_FOUND"
  | "MATCH_ACCEPTED"
  | "MATCH_REJECTED"
  | "TRADE_EXPIRED"
  | "NEW_MESSAGE"
  | "SWAP_PROPOSED"
  | "SWAP_ACCEPTED"
  | "SYSTEM";
export type ConversationStatus =
  | "ACTIVE"
  | "SWAP_PROPOSED"
  | "SWAP_ACCEPTED"
  | "DECLINED"
  | "EXPIRED";
export type MessageType = "TEXT" | "SYSTEM" | "TRIP_OFFER";
export type SystemAction =
  | "SWAP_PROPOSED"
  | "SWAP_ACCEPTED"
  | "SWAP_DECLINED"
  | "TRIP_OFFERED"
  | "TRIP_CHANGED"
  | "CONVERSATION_CLOSED";
export type SwapRuleType =
  | "OVERTIME_LIMIT"
  | "NO_PARTIAL_TRADE"
  | "DOMESTIC_RESTRICTION"
  | "QUALIFICATION_MISMATCH"
  | "BASE_MISMATCH"
  | "RANK_MISMATCH"
  | "REST_VIOLATION"
  | "SCHEDULE_CONFLICT";

export type TripType = "LAYOVER" | "TURNAROUND" | "MULTI_STOP";

export type SwapPostType =
  | "OFFERING_TRIPS"
  | "OFFERING_DAYS_OFF"
  | "GIVING_AWAY"
  | "LOOKING_FOR"
  | "VACATION_SWAP";

export type SwapPostStatus =
  | "OPEN"
  | "IN_NEGOTIATION"
  | "AGREED"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export type WantType =
  | "LAYOVER"
  | "LONGER_LAYOVER"
  | "ROUND_TRIP"
  | "ANY_FLIGHT"
  | "DAYS_OFF"
  | "ANYTHING"
  | "SPECIFIC";

export type LineType = "NORMAL" | "US_LINE" | "CHINA_LINE" | "RESERVE_LINE";
