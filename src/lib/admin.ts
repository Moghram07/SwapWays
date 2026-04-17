/**
 * Admin helpers for SwapWays.
 *
 * Routing: admin UI lives under `/dashboard/admin` (same dashboard shell as crew pages),
 * not a separate `/admin` tree — keeps auth/session and layout consistent.
 *
 * Feedback: product uses Prisma `FeedbackType` / `FeedbackStatus` (e.g. REQUEST, CLOSED),
 * not the alternate taxonomy from some external specs.
 */
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AdminAuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

/** Use in API routes: returns userId or a ready NextResponse (401/403). */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const access = await getCurrentUserAccess();
  if (!access.session?.user?.id) return { ok: false, response: unauthorizedResponse() };
  if (!access.isAdmin) return { ok: false, response: forbiddenResponse() };
  return { ok: true, userId: access.session.user.id };
}

export async function getCurrentUserAccess() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { session: null, user: null, isAdmin: false };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isAdmin: true, firstName: true, lastName: true, email: true },
  });
  return { session, user, isAdmin: !!user?.isAdmin };
}

export function unauthorizedResponse() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ data: null, error: "Forbidden", message: "Admin access required" }, { status: 403 });
}
