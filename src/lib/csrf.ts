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

export function requireSameOrigin(request: Request): NextResponse | null {
  const expectedOrigin = getExpectedOrigin(request);
  if (!expectedOrigin) return null;

  const origin = originFromHeader(request.headers.get("origin"));
  if (origin && origin !== expectedOrigin) {
    return NextResponse.json(
      { data: null, error: "Forbidden", message: "Cross-site request blocked." },
      { status: 403 }
    );
  }

  const referer = originFromHeader(request.headers.get("referer"));
  if (referer && referer !== expectedOrigin) {
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
