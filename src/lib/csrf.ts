import { NextResponse } from "next/server";

function getExpectedOrigin(request: Request): string | null {
  const configured =
    process.env.NEXTAUTH_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      return null;
    }
  }
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

function originFromHeader(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function normalizeHostname(hostname: string): string {
  return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
}

function originMatches(expectedOrigin: string, actualOrigin: string): boolean {
  try {
    const expected = new URL(expectedOrigin);
    const actual = new URL(actualOrigin);
    return (
      expected.protocol === actual.protocol &&
      normalizeHostname(expected.hostname) === normalizeHostname(actual.hostname) &&
      expected.port === actual.port
    );
  } catch {
    return expectedOrigin === actualOrigin;
  }
}

export function requireSameOrigin(request: Request): NextResponse | null {
  const expectedOrigin = getExpectedOrigin(request);
  if (!expectedOrigin) return null;

  const origin = originFromHeader(request.headers.get("origin"));
  if (origin && !originMatches(expectedOrigin, origin)) {
    return NextResponse.json(
      { data: null, error: "Forbidden", message: "Cross-site request blocked." },
      { status: 403 }
    );
  }

  const referer = originFromHeader(request.headers.get("referer"));
  if (referer && !originMatches(expectedOrigin, referer)) {
    return NextResponse.json(
      { data: null, error: "Forbidden", message: "Cross-site request blocked." },
      { status: 403 }
    );
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return NextResponse.json(
      { data: null, error: "Forbidden", message: "Cross-site request blocked." },
      { status: 403 }
    );
  }

  return null;
}
