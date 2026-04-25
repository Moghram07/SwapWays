import { NextResponse } from "next/server";

type EndableResponse = NextResponse | Response;

export function withTiming(routeName: string) {
  const start = Date.now();
  const log = (suffix = "") => {
    const duration = Date.now() - start;
    const label = suffix ? `${routeName} ${suffix}` : routeName;
    if (duration > 500) {
      console.warn(`[SLOW API] ${label}: ${duration}ms`);
    } else {
      console.log(`[API] ${label}: ${duration}ms`);
    }
  };

  return {
    end<T extends EndableResponse>(response: T): T {
      log();
      return response;
    },
    error(err?: unknown) {
      log("(error)");
      if (err) {
        console.error(`[API ERROR] ${routeName}`, err);
      }
    },
  };
}

