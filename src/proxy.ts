import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_WINDOW_MS = 60_000;
const GLOBAL_API_LIMIT_PER_MINUTE = 240;
const REGISTER_LIMIT_PER_MINUTE = 12;
const LOGIN_LIMIT_PER_MINUTE = 20;
const FEEDBACK_WRITE_LIMIT_PER_MINUTE = 20;
const MATCH_REFRESH_LIMIT_PER_MINUTE = 6;
const MESSAGE_WRITE_LIMIT_PER_MINUTE = 60;

const globalState = globalThis as unknown as {
  __swapWaysRateLimitStore?: Map<string, RateLimitEntry>;
};

function getStore(): Map<string, RateLimitEntry> {
  if (!globalState.__swapWaysRateLimitStore) {
    globalState.__swapWaysRateLimitStore = new Map<string, RateLimitEntry>();
  }
  return globalState.__swapWaysRateLimitStore;
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function consumeRateLimit(key: string, limit: number): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const store = getStore();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfterSec: Math.ceil(RATE_WINDOW_MS / 1000) };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  store.set(key, existing);
  return { allowed: true, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
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

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/4" || pathname.startsWith("/4/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/4" ? "/" : pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const isApi = pathname.startsWith("/api/");
  const ip = getClientIp(request);
  const method = request.method.toUpperCase();

  if (isApi) {
    const globalKey = `global:${ip}`;
    const globalResult = consumeRateLimit(globalKey, GLOBAL_API_LIMIT_PER_MINUTE);
    if (!globalResult.allowed) {
      const response = tooManyRequests(globalResult.retryAfterSec);
      applySecurityHeaders(request, response);
      return response;
    }

    if (pathname === "/api/auth/register") {
      const registerKey = `register:${ip}`;
      const registerResult = consumeRateLimit(registerKey, REGISTER_LIMIT_PER_MINUTE);
      if (!registerResult.allowed) {
        const response = tooManyRequests(registerResult.retryAfterSec);
        applySecurityHeaders(request, response);
        return response;
      }
    }

    if (pathname === "/api/auth/callback/credentials") {
      const loginKey = `login:${ip}`;
      const loginResult = consumeRateLimit(loginKey, LOGIN_LIMIT_PER_MINUTE);
      if (!loginResult.allowed) {
        const response = tooManyRequests(loginResult.retryAfterSec);
        applySecurityHeaders(request, response);
        return response;
      }
    }

    if (pathname === "/api/swap-posts/match-refresh") {
      const refreshKey = `match-refresh:${ip}`;
      const refreshResult = consumeRateLimit(refreshKey, MATCH_REFRESH_LIMIT_PER_MINUTE);
      if (!refreshResult.allowed) {
        const response = tooManyRequests(refreshResult.retryAfterSec);
        applySecurityHeaders(request, response);
        return response;
      }
    }

    if (method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE") {
      if (pathname === "/api/feedback") {
        const feedbackKey = `feedback-write:${ip}`;
        const feedbackResult = consumeRateLimit(feedbackKey, FEEDBACK_WRITE_LIMIT_PER_MINUTE);
        if (!feedbackResult.allowed) {
          const response = tooManyRequests(feedbackResult.retryAfterSec);
          applySecurityHeaders(request, response);
          return response;
        }
      }

      if (pathname.startsWith("/api/conversations/") && pathname.endsWith("/messages")) {
        const messagesKey = `messages-write:${ip}`;
        const messagesResult = consumeRateLimit(messagesKey, MESSAGE_WRITE_LIMIT_PER_MINUTE);
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

