import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/types/enums";

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data as object | undefined,
    },
  });
}

export async function findNotificationsByUserId(userId: string, limit = 50) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
