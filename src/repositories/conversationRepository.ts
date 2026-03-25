import { prisma } from "@/lib/prisma";

export async function findConversationsByUserId(userId: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { initiatorId: userId },
        { tradeOwnerId: userId },
        { postOwnerId: userId },
      ],
      status: { not: "EXPIRED" },
    },
    include: {
      initiator: { select: { id: true, firstName: true } },
      tradeOwner: { select: { id: true, firstName: true } },
      postOwner: { select: { id: true, firstName: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
      },
    },
    orderBy: { lastMessageAt: "desc" },
  });

  const ids = conversations.map((c) => c.id);
  const unreadByConv =
    ids.length === 0
      ? []
      : await prisma.message.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: ids },
            senderId: { not: userId },
            isRead: false,
          },
          _count: { id: true },
        });

  const unreadMap = new Map(unreadByConv.map((u) => [u.conversationId, u._count.id]));
  return conversations.map((conv) => ({
    ...conv,
    unreadCount: unreadMap.get(conv.id) ?? 0,
  }));
}
