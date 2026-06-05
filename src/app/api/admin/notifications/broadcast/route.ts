import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendResendTransactionalEmail } from "@/lib/resendTransactionalEmail";

// A 100-email batch runs ~30s (100 × 300ms gap). Raise the function ceiling so the
// loop isn't cut off mid-batch (default serverless timeout is often 10–15s).
export const maxDuration = 60;

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function audienceWhere(audience: string): Prisma.UserWhereInput {
  const now = new Date();
  switch (audience) {
    case "premium":
      return {
        OR: [
          { tier: "PREMIUM", subscriptionStatus: "ACTIVE" },
          { tier: "PREMIUM", subscriptionStatus: "TRIALING", trialEndsAt: { gt: now } },
        ],
      };
    case "free":
      return { tier: "FREE" };
    case "trialing":
      return { subscriptionStatus: "TRIALING", trialEndsAt: { gt: now } };
    default:
      return {};
  }
}

function parseAudience(raw: unknown): string {
  return ["all", "premium", "free", "trialing"].includes(String(raw)) ? String(raw) : "all";
}

/** List candidate recipients for the picker. Lightweight (id/name/email), no row cap. */
export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const audience = parseAudience(searchParams.get("audience"));
  const users = await prisma.user.findMany({
    where: audienceWhere(audience),
    select: { id: true, firstName: true, lastName: true, email: true, lastBroadcastEmailedAt: true },
    orderBy: { createdAt: "asc" },
  });
  return json({ users, total: users.length, audience });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    audience?: string;
    title?: string;
    message?: string;
    emailUsers?: boolean;
    emailOnly?: boolean;
    skip?: number;
    take?: number;
    userIds?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const audience = parseAudience(body.audience);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const emailUsers = body.emailUsers === true;
  const emailOnly = body.emailOnly === true;
  if (!title || !message) return error("title and message are required", 400);

  // Explicit recipient selection (the picker) takes precedence: send to exactly these users.
  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((x): x is string => typeof x === "string" && x.length > 0)
    : null;
  const hasExplicitIds = userIds != null && userIds.length > 0;

  // Fallback batching for count-based sends (no explicit selection): stable createdAt order
  // makes skip/take deterministic so a later run with skip=<already sent> resumes cleanly.
  const skip = !hasExplicitIds && Number.isInteger(body.skip) && (body.skip as number) >= 0 ? (body.skip as number) : 0;
  const take =
    !hasExplicitIds && Number.isInteger(body.take) && (body.take as number) > 0
      ? Math.min(body.take as number, 1000)
      : undefined;

  const where: Prisma.UserWhereInput = hasExplicitIds
    ? { AND: [audienceWhere(audience), { id: { in: userIds } }] }
    : audienceWhere(audience);
  const total = await prisma.user.count({ where });
  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, firstName: true },
    orderBy: { createdAt: "asc" },
    skip,
    ...(take != null ? { take } : {}),
  });
  const nextSkip = skip + users.length;
  const hasMore = !hasExplicitIds && nextSkip < total;

  // Create in-app notifications (skipped when emailOnly is true)
  const chunkSize = 500;
  let created = 0;
  if (!emailOnly) {
    for (let i = 0; i < users.length; i += chunkSize) {
      const slice = users.slice(i, i + chunkSize);
      const res = await prisma.notification.createMany({
        data: slice.map((u) => ({
          userId: u.id,
          type: "SYSTEM" as const,
          title,
          message,
          data: { audience, source: "admin_broadcast" },
        })),
      });
      created += res.count;
    }
  }

  // Send emails one at a time with a 300ms delay between each to avoid Resend rate limits.
  // Fire-and-forget patterns are killed in serverless — this must be fully awaited.
  let emailsSent = 0;
  let emailsFailed = 0;
  let firstFailureReason = "";
  if ((emailUsers || emailOnly) && users.length > 0) {
    const emailText = [title, "", message, "", "— The SwapWays Team"].join("\n");
    // Only stamp users we actually emailed, so failures stay eligible for a later retry.
    const emailedIds: string[] = [];
    for (const u of users) {
      const result = await sendResendTransactionalEmail({
        to: u.email,
        subject: title,
        text: u.firstName ? `Hi ${u.firstName},\n\n${emailText}` : emailText,
      });
      if (result.ok) {
        emailsSent++;
        emailedIds.push(u.id);
      } else {
        emailsFailed++;
        const reason = result.reason === "RESEND_REJECTED"
          ? `HTTP ${result.status}: ${result.detail}`
          : result.reason;
        console.error(`[broadcast] Failed to email ${u.email}: ${reason}`);
        if (!firstFailureReason) firstFailureReason = reason;
      }
      // 300ms gap between sends to stay within Resend rate limits
      await new Promise((r) => setTimeout(r, 300));
    }
    // Record the send so "skip already-emailed" can exclude them next time.
    if (emailedIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: emailedIds } },
        data: { lastBroadcastEmailedAt: new Date() },
      }).catch((err) => console.error("[broadcast] failed to stamp lastBroadcastEmailedAt", err));
    }
    if (emailsFailed > 0) {
      console.warn(`[broadcast] emails: ${emailsSent} sent, ${emailsFailed} failed. First failure: ${firstFailureReason}`);
    }
  }

  return json({
    sent: created,
    audience,
    emailed: emailUsers || emailOnly,
    emailsSent,
    emailsFailed,
    firstFailureReason: firstFailureReason || null,
    total,
    skip,
    take: take ?? null,
    processed: users.length,
    nextSkip,
    hasMore,
  });
}

export async function DELETE() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { count } = await prisma.notification.deleteMany({
    where: { type: "SYSTEM", data: { path: ["source"], equals: "admin_broadcast" } },
  });

  return json({ deleted: count });
}
