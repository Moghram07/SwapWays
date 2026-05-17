const RIYADH_TIME_ZONE = "Asia/Riyadh";

const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

type RiyadhDateParts = {
  year: number;
  month: number;
  day: number;
};

type TripLike = {
  departureDate: Date | string;
  reportTime?: string | null;
  scheduleTrip?: unknown;
};

type SwapPostLike = {
  postType: string;
  expiresAt?: Date | string | null;
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDate?: Date | string | null;
  vacationEndDate?: Date | string | null;
  quickDate?: Date | string | null;
  /** When there are no trips and no quickDate, used to drop orphan / legacy rows from listings. */
  createdAt?: Date | string | null;
  offeredTrips?: TripLike[];
};

type TradeLike = {
  tradeType: string;
  departureDate: Date | string | null;
  reportTime?: string | null;
  vacationStartDate?: Date | string | null;
  vacationEndDate?: Date | string | null;
};

type LineSwapLike = {
  year: number;
  month: string;
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function getRiyadhDateParts(date: Date): RiyadhDateParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RIYADH_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === "year")?.value ?? "0");
  const month = Number(parts.find((p) => p.type === "month")?.value ?? "0");
  const day = Number(parts.find((p) => p.type === "day")?.value ?? "0");

  return { year, month, day };
}

function parseReportTime(timeRaw: string | null | undefined): { hour: number; minute: number } {
  if (!timeRaw) return { hour: 0, minute: 0 };
  const normalized = timeRaw.trim().toUpperCase();
  const match = normalized.match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return { hour: 0, minute: 0 };
  const hour = Math.max(0, Math.min(23, Number(match[1])));
  const minute = Math.max(0, Math.min(59, Number(match[2])));
  return { hour, minute };
}

function getRiyadhMonthStartUtc(year: number, month: number): Date {
  // Riyadh is UTC+3 all year. Riyadh 00:00 maps to UTC previous day 21:00.
  return new Date(Date.UTC(year, month - 1, 1, -3, 0, 0, 0));
}

function getRiyadhDateTimeUtc(date: Date, timeRaw?: string | null): Date {
  const { year, month, day } = getRiyadhDateParts(date);
  const { hour, minute } = parseReportTime(timeRaw);
  return new Date(Date.UTC(year, month - 1, day, hour - 3, minute, 0, 0));
}

function parseMonthName(month: string): number | null {
  const key = month.trim().slice(0, 3).toUpperCase();
  return MONTH_NAME_TO_NUMBER[key] ?? null;
}

export function isLineSwapExpired(post: LineSwapLike, now = new Date()): boolean {
  const month = parseMonthName(post.month);
  if (!month) return false;
  return now.getTime() >= getRiyadhMonthStartUtc(post.year, month).getTime();
}

export function isTradeExpired(trade: TradeLike, now = new Date()): boolean {
  if (trade.tradeType === "VACATION_SWAP") {
    if (trade.vacationEndDate) {
      const end = getRiyadhDateTimeUtc(toDate(trade.vacationEndDate), "23:59");
      return now.getTime() > end.getTime();
    }
    if (!trade.vacationStartDate) return false;
    const endOfStartDay = getRiyadhDateTimeUtc(toDate(trade.vacationStartDate), "23:59");
    return now.getTime() > endOfStartDay.getTime();
  }
  if (!trade.departureDate) return false;
  const flightDateTime = getRiyadhDateTimeUtc(toDate(trade.departureDate), trade.reportTime ?? "00:00");
  return now.getTime() >= flightDateTime.getTime();
}

export function isSwapPostExpired(post: SwapPostLike, now = new Date()): boolean {
  // Tier-based hard deadline: if expiresAt is past, always expired.
  if (post.expiresAt && now.getTime() >= toDate(post.expiresAt).getTime()) {
    return true;
  }
  // expiresAt in the future does NOT prevent trip-date expiry —
  // a post whose trip already flew should leave active even within the tier window.

  if (post.postType === "VACATION_SWAP") {
    if (post.vacationEndDate) {
      const end = getRiyadhDateTimeUtc(toDate(post.vacationEndDate), "23:59");
      return now.getTime() > end.getTime();
    }
    if (post.vacationYear && post.vacationMonth) {
      return now.getTime() >= getRiyadhMonthStartUtc(post.vacationYear, post.vacationMonth).getTime();
    }
    if (post.vacationStartDate) {
      const endOfStartDay = getRiyadhDateTimeUtc(toDate(post.vacationStartDate), "23:59");
      return now.getTime() > endOfStartDay.getTime();
    }
    return false;
  }

  const trips = post.offeredTrips ?? [];
  if (trips.length > 0) {
    const hasFutureTrip = trips.some((trip) => {
      const departure = getRiyadhDateTimeUtc(
        toDate(trip.departureDate),
        trip.reportTime ?? "00:00"
      );
      return departure.getTime() > now.getTime();
    });
    return !hasFutureTrip;
  }

  if (post.quickDate) {
    const endOfQuickDay = getRiyadhDateTimeUtc(toDate(post.quickDate), "23:59");
    return now.getTime() > endOfQuickDay.getTime();
  }

  if (post.postType !== "VACATION_SWAP" && post.createdAt) {
    const endOfCreatedDay = getRiyadhDateTimeUtc(toDate(post.createdAt), "23:59");
    return now.getTime() > endOfCreatedDay.getTime();
  }

  return false;
}

