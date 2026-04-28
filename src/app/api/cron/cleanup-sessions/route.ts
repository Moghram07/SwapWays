import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ data: null, error: "Unauthorized", message: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const result = await prisma.userSession.deleteMany({
    where: { lastActiveAt: { lt: thirtyDaysAgo } },
  });

  return NextResponse.json({ data: { deleted: result.count }, error: null, message: null });
}
