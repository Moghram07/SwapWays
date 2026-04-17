import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

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

  let body: { audience?: string; title?: string; message?: string };
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
  if (!title || !message) return error("title and message are required", 400);

  const where = audienceWhere(audience);
  const users = await prisma.user.findMany({
    where,
    select: { id: true },
  });

  const chunkSize = 500;
  let created = 0;
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

  return json({ sent: created, audience });
}
