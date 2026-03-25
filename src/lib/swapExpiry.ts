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
  scheduleTrip?: { reportTime: string | null } | null;
};

type SwapPostLike = {
  postType: string;
  vacationYear?: number | null;
  vacationMonth?: number | null;
  vacationStartDate?: Date | string | null;
  offeredTrips?: TripLike[];
};

type TradeLike = {
  tradeType: string;
  departureDate: Date | string | null;
  reportTime?: string | null;
  vacationStartDate?: Date | string | null;
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
    if (!trade.vacationStartDate) return false;
    const start = getRiyadhDateTimeUtc(toDate(trade.vacationStartDate), "00:00");
    return now.getTime() >= start.getTime();
  }
  if (!trade.departureDate) return false;
  const flightDateTime = getRiyadhDateTimeUtc(toDate(trade.departureDate), trade.reportTime ?? "00:00");
  return now.getTime() >= flightDateTime.getTime();
}

export function isSwapPostExpired(post: SwapPostLike, now = new Date()): boolean {
  if (post.postType === "VACATION_SWAP") {
    if (post.vacationYear && post.vacationMonth) {
      return now.getTime() >= getRiyadhMonthStartUtc(post.vacationYear, post.vacationMonth).getTime();
    }
    if (post.vacationStartDate) {
      const start = getRiyadhDateTimeUtc(toDate(post.vacationStartDate), "00:00");
      return now.getTime() >= start.getTime();
    }
    return false;
  }

  const trips = post.offeredTrips ?? [];
  if (trips.length === 0) return false;
  const hasFutureTrip = trips.some((trip) => {
    const departure = getRiyadhDateTimeUtc(
      toDate(trip.departureDate),
      trip.scheduleTrip?.reportTime ?? "00:00"
    );
    return departure.getTime() > now.getTime();
  });
  return !hasFutureTrip;
}

