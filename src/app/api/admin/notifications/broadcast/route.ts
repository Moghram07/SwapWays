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

  // Optionally send emails synchronously — awaited so the function doesn't return before
  // emails are dispatched (fire-and-forget is killed in serverless before it completes).
  let emailsSent = 0;
  let emailsFailed = 0;
  if ((emailUsers || emailOnly) && users.length > 0) {
    const emailText = [title, "", message, "", "— The SwapWays Team"].join("\n");
    for (let i = 0; i < users.length; i += 50) {
      const slice = users.slice(i, i + 50);
      const results = await Promise.allSettled(
        slice.map((u) =>
          sendResendTransactionalEmail({
            to: u.email,
            subject: title,
            text: u.firstName ? `Hi ${u.firstName},\n\n${emailText}` : emailText,
          })
        )
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.ok) emailsSent++;
        else emailsFailed++;
      }
    }
    if (emailsFailed > 0) {
      console.warn(`[broadcast] emails: ${emailsSent} sent, ${emailsFailed} failed`);
    }
  }

  return json({ sent: created, audience, emailed: emailUsers || emailOnly, emailsSent, emailsFailed });
}

export async function DELETE() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { count } = await prisma.notification.deleteMany({
    where: { type: "SYSTEM", data: { path: ["source"], equals: "admin_broadcast" } },
  });

  return json({ deleted: count });
}
