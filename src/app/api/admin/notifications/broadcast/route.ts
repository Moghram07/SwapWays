import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { sendResendTransactionalEmail } from "@/lib/resendTransactionalEmail";

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

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { audience?: string; title?: string; message?: string; emailUsers?: boolean; emailOnly?: boolean };
  try {
    body = await request.json();
  } catch {
    return error("Invalid JSON", 400);
  }

  const audience = ["all", "premium", "free", "trialing"].includes(String(body.audience))
    ? String(body.audience)
    : "all";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const emailUsers = body.emailUsers === true;
  const emailOnly = body.emailOnly === true;
  if (!title || !message) return error("title and message are required", 400);

  const where = audienceWhere(audience);
  const users = await prisma.user.findMany({
    where,
    select: { id: true, email: true, firstName: true },
  });

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
    for (const u of users) {
      const result = await sendResendTransactionalEmail({
        to: u.email,
        subject: title,
        text: u.firstName ? `Hi ${u.firstName},\n\n${emailText}` : emailText,
      });
      if (result.ok) {
        emailsSent++;
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
    if (emailsFailed > 0) {
      console.warn(`[broadcast] emails: ${emailsSent} sent, ${emailsFailed} failed. First failure: ${firstFailureReason}`);
    }
  }

  return json({ sent: created, audience, emailed: emailUsers || emailOnly, emailsSent, emailsFailed, firstFailureReason: firstFailureReason || null });
}

export async function DELETE() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { count } = await prisma.notification.deleteMany({
    where: { type: "SYSTEM", data: { path: ["source"], equals: "admin_broadcast" } },
  });

  return json({ deleted: count });
}
