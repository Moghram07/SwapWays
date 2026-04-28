import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const flags = await prisma.accountFlag.findMany({
    where: { isResolved: false },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, tier: true, subscriptionStatus: true },
      },
    },
    take: 100,
  });

  return json(flags);
}
