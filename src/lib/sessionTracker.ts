import { prisma } from "@/lib/prisma";

function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function trackSession(userId: string, request: Request) {
  const ipAddress = getClientIp(request);
  if (!ipAddress || ipAddress === "unknown") return;

  const userAgent = request.headers.get("user-agent") || "unknown";
  try {
    await prisma.userSession.upsert({
      where: { userId_ipAddress: { userId, ipAddress } },
      update: { lastActiveAt: new Date(), userAgent },
      create: {
        userId,
        ipAddress,
        userAgent,
      },
    });
    await checkForAccountSharing(userId);
  } catch {
    // Session tracking should never block primary requests.
  }
}

async function checkForAccountSharing(userId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sessions = await prisma.userSession.findMany({
    where: { userId, lastActiveAt: { gte: oneHourAgo } },
    select: { ipAddress: true },
  });
  const distinctIps = [...new Set(sessions.map((s) => s.ipAddress))];
  if (distinctIps.length < 3) return;

  const details = `${distinctIps.length} different IPs active within 1 hour: ${distinctIps.slice(0, 5).join(", ")}`;
  const existing = await prisma.accountFlag.findFirst({
    where: { userId, type: "CONCURRENT_SESSIONS", isResolved: false },
    select: { id: true },
  });

  if (existing) {
    await prisma.accountFlag.update({
      where: { id: existing.id },
      data: { details },
    });
    return;
  }

  await prisma.accountFlag.create({
    data: {
      userId,
      type: "CONCURRENT_SESSIONS",
      details,
    },
  });
}
