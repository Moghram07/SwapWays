import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { findNotificationsByUserId } from "@/lib/notifications";
import { findMatchesByUserId } from "@/repositories/matchRepository";
import { NotificationsClient, type NotificationItem } from "./NotificationsClient";
import { withTimeout } from "@/lib/withTimeout";

export const dynamic = "force-dynamic";

function formatTimeAgo(date: Date): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

type SortableItem = NotificationItem & { _createdAt: Date };

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  let matches: Awaited<ReturnType<typeof findMatchesByUserId>> = [];
  let dbNotifications: Awaited<ReturnType<typeof findNotificationsByUserId>> = [];
  if (userId) {
    [matches, dbNotifications] = await Promise.all([
      withTimeout(findMatchesByUserId(userId, { take: 50, lightweight: true }), 6000, "notifications/matches")
        .catch((err) => { console.error("[dashboard/notifications] matches query failed", err); return []; }),
      withTimeout(findNotificationsByUserId(userId, 50), 6000, "notifications/db")
        .catch((err) => { console.error("[dashboard/notifications] notifications query failed", err); return []; }),
    ]);
  }

  const matchItems: SortableItem[] = matches.map((m) => {
    const isOfferer = m.offererId === session?.user?.id;
    const other = isOfferer ? m.receiver : m.offerer;
    const otherName = other
      ? `${other.firstName} ${other.lastName}`
      : "A crew member";
    const tradeRef = m.trade?.id?.slice(-4).toUpperCase() ?? "";

    if (m.status === "ACCEPTED") {
      return {
        id: m.id,
        type: "swap_accepted" as const,
        title: "Swap request accepted",
        detail: `${otherName} accepted your swap request${tradeRef ? ` for ${tradeRef}` : ""}.`,
        timeAgo: formatTimeAgo(new Date(m.createdAt)),
        unread: true,
        icon: "swap" as const,
        iconBg: "#2DAF6620",
        iconColor: "#2DAF66",
        _createdAt: new Date(m.createdAt),
      };
    }
    if (m.status === "PENDING" && !isOfferer) {
      return {
        id: m.id,
        type: "swap_proposal" as const,
        title: "Swap proposal received",
        detail: `${otherName} sent you a swap proposal${tradeRef ? ` · ${tradeRef}` : ""}.`,
        timeAgo: formatTimeAgo(new Date(m.createdAt)),
        unread: true,
        icon: "swap" as const,
        iconBg: "#1E6FB920",
        iconColor: "#1E6FB9",
        _createdAt: new Date(m.createdAt),
      };
    }
    return {
      id: m.id,
      type: "new_match" as const,
      title: "New match found",
      detail: `You have a new swap match with ${otherName}${tradeRef ? ` · ${tradeRef}` : ""}.`,
      timeAgo: formatTimeAgo(new Date(m.createdAt)),
      unread: true,
      icon: "plane" as const,
      iconBg: "#1E6FB920",
      iconColor: "#1E6FB9",
      linkHref: "/dashboard/matches",
      _createdAt: new Date(m.createdAt),
    };
  });

  const notificationItems: SortableItem[] = dbNotifications.map((n) => {
    const data = n.data as { conversationId?: string } | null;
    const conversationId = data?.conversationId;
    if (n.type === "SWAP_PROPOSED") {
      return {
        id: n.id,
        type: "swap_proposal" as const,
        title: n.title || "Swap proposed",
        detail: n.message || "A crew member has formally proposed a swap.",
        timeAgo: formatTimeAgo(n.createdAt),
        unread: !n.isRead,
        icon: "swap" as const,
        iconBg: "#1E6FB920",
        iconColor: "#1E6FB9",
        ...(conversationId && { conversationId }),
        _createdAt: n.createdAt,
      };
    }
    if (n.type === "SWAP_ACCEPTED") {
      return {
        id: n.id,
        type: "swap_accepted" as const,
        title: n.title || "Swap accepted",
        detail: n.message || "A crew member accepted your swap.",
        timeAgo: formatTimeAgo(n.createdAt),
        unread: !n.isRead,
        icon: "check" as const,
        iconBg: "#2DAF6620",
        iconColor: "#2DAF66",
        ...(conversationId && { conversationId }),
        _createdAt: n.createdAt,
      };
    }
    if (n.type === "MATCH_FOUND") {
      return {
        id: n.id,
        type: "new_match" as const,
        title: n.title || "New match found",
        detail: n.message || "A new swap post matched your preferences.",
        timeAgo: formatTimeAgo(n.createdAt),
        unread: !n.isRead,
        icon: "plane" as const,
        iconBg: "#1E6FB920",
        iconColor: "#1E6FB9",
        linkHref: "/dashboard/matches",
        _createdAt: n.createdAt,
      };
    }
    if (n.type === "NEW_MESSAGE") {
      return {
        id: n.id,
        type: "new_message" as const,
        title: n.title,
        detail: n.message || "New message in a conversation.",
        timeAgo: formatTimeAgo(n.createdAt),
        unread: !n.isRead,
        icon: "message" as const,
        iconBg: "#1E6FB920",
        iconColor: "#1E6FB9",
        ...(conversationId && { conversationId }),
        _createdAt: n.createdAt,
      };
    }
    // SYSTEM, ACCOUNT_WARNING, FEEDBACK_REPLY, and any other types
    return {
      id: n.id,
      type: "system" as const,
      title: n.title,
      detail: n.message || "",
      timeAgo: formatTimeAgo(n.createdAt),
      unread: !n.isRead,
      icon: "bell" as const,
      iconBg: "#64748b20",
      iconColor: "#64748b",
      _createdAt: n.createdAt,
    };
  });

  const notifications: NotificationItem[] = [...matchItems, ...notificationItems]
    .sort((a, b) => b._createdAt.getTime() - a._createdAt.getTime())
    .map((item) => {
      const { _createdAt, ...rest } = item;
      void _createdAt;
      return rest;
    });

  return <NotificationsClient initialNotifications={notifications} />;
}
