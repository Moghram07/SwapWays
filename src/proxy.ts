import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localizePath } from "@/i18n/config";
import { consumeRateLimit } from "@/lib/rateLimit";

const RATE_WINDOW_MS = 60_000;
const GLOBAL_API_LIMIT_PER_MINUTE = 240;
const REGISTER_LIMIT_PER_MINUTE = 12;
const LOGIN_LIMIT_PER_MINUTE = 20;
const FEEDBACK_WRITE_LIMIT_PER_MINUTE = 20;
const CONTACT_WRITE_LIMIT_PER_MINUTE = 12;
const MATCH_REFRESH_LIMIT_PER_MINUTE = 6;
const MESSAGE_WRITE_LIMIT_PER_MINUTE = 60;

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function applySecurityHeaders(request: NextRequest, response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data: blob: https:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "connect-src 'self' https: wss:",
        "worker-src 'self' blob:",
      ].join("; ")
    );
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto === "https" || request.nextUrl.protocol === "https:") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}

function tooManyRequests(retryAfterSec: number): NextResponse {
  const response = NextResponse.json(
    {
      data: null,
      error: "RateLimitExceeded",
      message: "Too many requests. Please try again shortly.",
    },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(retryAfterSec));
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathLocale = pathname.split("/").filter(Boolean)[0];
  const localeFromPath = isLocale(pathLocale) ? pathLocale : null;
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const localeFromCookie = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  const localeScopedPaths = new Set(["/", "/login", "/register", "/privacy", "/terms", "/support", "/contact"]);

  if (!pathname.startsWith("/api/") && localeScopedPaths.has(pathname) && !localeFromPath) {
    const url = request.nextUrl.clone();
    url.pathname = localizePath(pathname, localeFromCookie);
    return NextResponse.redirect(url, 307);
  }

  if (!pathname.startsWith("/api/") && localeFromPath) {
    const response = NextResponse.next();
    response.cookies.set(LOCALE_COOKIE, localeFromPath, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
    applySecurityHeaders(request, response);
    return response;
  }

  if (pathname === "/4" || pathname.startsWith("/4/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/4" ? "/" : pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const isApi = pathname.startsWith("/api/");
  const ip = getClientIp(request);
  const method = request.method.toUpperCase();

  if (isApi) {
    const globalResult = await consumeRateLimit({
      namespace: "global",
      key: ip,
      limit: GLOBAL_API_LIMIT_PER_MINUTE,
      windowMs: RATE_WINDOW_MS,
    });
    if (!globalResult.allowed) {
      const response = tooManyRequests(globalResult.retryAfterSec);
      applySecurityHeaders(request, response);
      return response;
    }

    if (pathname === "/api/auth/register") {
      const registerResult = await consumeRateLimit({
        namespace: "register",
        key: ip,
        limit: REGISTER_LIMIT_PER_MINUTE,
        windowMs: RATE_WINDOW_MS,
      });
      if (!registerResult.allowed) {
        const response = tooManyRequests(registerResult.retryAfterSec);
        applySecurityHeaders(request, response);
        return response;
      }
    }

    if (pathname === "/api/auth/callback/credentials") {
      const loginResult = await consumeRateLimit({
        namespace: "login",
        key: ip,
        limit: LOGIN_LIMIT_PER_MINUTE,
        windowMs: RATE_WINDOW_MS,
      });
      if (!loginResult.allowed) {
        const response = tooManyRequests(loginResult.retryAfterSec);
        applySecurityHeaders(request, response);
        return response;
      }
    }

    if (pathname === "/api/swap-posts/match-refresh") {
      const refreshResult = await consumeRateLimit({
        namespace: "match-refresh",
        key: ip,
        limit: MATCH_REFRESH_LIMIT_PER_MINUTE,
        windowMs: RATE_WINDOW_MS,
      });
      if (!refreshResult.allowed) {
        const response = tooManyRequests(refreshResult.retryAfterSec);
        applySecurityHeaders(request, response);
        return response;
      }
    }

    if (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE") {
      if (pathname === "/api/feedback") {
        const feedbackResult = await consumeRateLimit({
          namespace: "feedback-write",
          key: ip,
          limit: FEEDBACK_WRITE_LIMIT_PER_MINUTE,
          windowMs: RATE_WINDOW_MS,
        });
        if (!feedbackResult.allowed) {
          const response = tooManyRequests(feedbackResult.retryAfterSec);
          applySecurityHeaders(request, response);
          return response;
        }
      }

      if (pathname === "/api/contact") {
        const contactResult = await consumeRateLimit({
          namespace: "contact-write",
          key: ip,
          limit: CONTACT_WRITE_LIMIT_PER_MINUTE,
          windowMs: RATE_WINDOW_MS,
        });
        if (!contactResult.allowed) {
          const response = tooManyRequests(contactResult.retryAfterSec);
          applySecurityHeaders(request, response);
          return response;
        }
      }

      if (pathname.startsWith("/api/conversations/") && pathname.endsWith("/messages")) {
        const messagesResult = await consumeRateLimit({
          namespace: "messages-write",
          key: ip,
          limit: MESSAGE_WRITE_LIMIT_PER_MINUTE,
          windowMs: RATE_WINDOW_MS,
        });
        if (!messagesResult.allowed) {
          const response = tooManyRequests(messagesResult.retryAfterSec);
          applySecurityHeaders(request, response);
          return response;
        }
      }
    }
  }

  const response = NextResponse.next();
  applySecurityHeaders(request, response);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js).*)",
  ],
};

