import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export type FeedbackType = "REQUEST" | "QUESTION" | "SUGGESTION";
export type FeedbackStatus = "OPEN" | "IN_PROGRESS" | "CLOSED";
export type FeedbackPriority = "LOW" | "NORMAL" | "HIGH";

export type FeedbackListItem = {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  subject: string | null;
  message: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  assigneeId: string | null;
  assigneeFirstName: string | null;
  assigneeLastName: string | null;
  assigneeEmail: string | null;
};

type CountRow = { count: bigint };

function joinSqlWithAnd(parts: Prisma.Sql[]): Prisma.Sql {
  if (parts.length === 0) return Prisma.empty;
  return parts.slice(1).reduce((acc, part) => Prisma.sql`${acc} AND ${part}`, parts[0]!);
}

function joinSqlWithComma(parts: Prisma.Sql[]): Prisma.Sql {
  if (parts.length === 0) return Prisma.empty;
  return parts.slice(1).reduce((acc, part) => Prisma.sql`${acc}, ${part}`, parts[0]!);
}

export async function createFeedback(input: {
  userId: string;
  type: FeedbackType;
  subject?: string | null;
  message: string;
}) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      type: FeedbackType;
      status: FeedbackStatus;
      priority: FeedbackPriority;
      subject: string | null;
      message: string;
      createdAt: Date;
      updatedAt: Date;
    }>
  >`
    INSERT INTO "Feedback" ("id", "userId", "type", "subject", "message")
    VALUES (${randomUUID()}, ${input.userId}, ${input.type}::"FeedbackType", ${input.subject ?? null}, ${input.message})
    RETURNING "id", "userId", "type", "status", "priority", "subject", "message", "createdAt", "updatedAt"
  `;
  return rows[0] ?? null;
}

export async function listFeedback(filters: {
  status?: FeedbackStatus;
  type?: FeedbackType;
  q?: string;
  limit: number;
  offset: number;
}) {
  const whereParts: Prisma.Sql[] = [];
  if (filters.status) whereParts.push(Prisma.sql`f."status" = ${filters.status}::"FeedbackStatus"`);
  if (filters.type) whereParts.push(Prisma.sql`f."type" = ${filters.type}::"FeedbackType"`);
  if (filters.q && filters.q.trim()) {
    const pattern = `%${filters.q.trim()}%`;
    whereParts.push(
      Prisma.sql`(
        f."subject" ILIKE ${pattern}
        OR f."message" ILIKE ${pattern}
        OR u."firstName" ILIKE ${pattern}
        OR u."lastName" ILIKE ${pattern}
        OR u."email" ILIKE ${pattern}
      )`
    );
  }
  const whereClause = joinSqlWithAnd(whereParts);
  const [rows, countRows] =
    whereParts.length > 0
      ? await Promise.all([
          prisma.$queryRaw<FeedbackListItem[]>`
            SELECT
              f."id",
              f."type",
              f."status",
              f."priority",
              f."subject",
              f."message",
              f."adminNote",
              f."createdAt",
              f."updatedAt",
              f."resolvedAt",
              f."userId",
              u."firstName" AS "userFirstName",
              u."lastName" AS "userLastName",
              u."email" AS "userEmail",
              f."assigneeId",
              au."firstName" AS "assigneeFirstName",
              au."lastName" AS "assigneeLastName",
              au."email" AS "assigneeEmail"
            FROM "Feedback" f
            JOIN "User" u ON u."id" = f."userId"
            LEFT JOIN "User" au ON au."id" = f."assigneeId"
            WHERE ${whereClause}
            ORDER BY f."createdAt" DESC
            LIMIT ${filters.limit}
            OFFSET ${filters.offset}
          `,
          prisma.$queryRaw<CountRow[]>`
            SELECT COUNT(*)::bigint AS count
            FROM "Feedback" f
            JOIN "User" u ON u."id" = f."userId"
            WHERE ${whereClause}
          `,
        ])
      : await Promise.all([
          prisma.$queryRaw<FeedbackListItem[]>`
            SELECT
              f."id",
              f."type",
              f."status",
              f."priority",
              f."subject",
              f."message",
              f."adminNote",
              f."createdAt",
              f."updatedAt",
              f."resolvedAt",
              f."userId",
              u."firstName" AS "userFirstName",
              u."lastName" AS "userLastName",
              u."email" AS "userEmail",
              f."assigneeId",
              au."firstName" AS "assigneeFirstName",
              au."lastName" AS "assigneeLastName",
              au."email" AS "assigneeEmail"
            FROM "Feedback" f
            JOIN "User" u ON u."id" = f."userId"
            LEFT JOIN "User" au ON au."id" = f."assigneeId"
            ORDER BY f."createdAt" DESC
            LIMIT ${filters.limit}
            OFFSET ${filters.offset}
          `,
          prisma.$queryRaw<CountRow[]>`
            SELECT COUNT(*)::bigint AS count
            FROM "Feedback" f
            JOIN "User" u ON u."id" = f."userId"
          `,
        ]);

  return {
    items: rows,
    total: Number(countRows[0]?.count ?? BigInt(0)),
  };
}

export async function updateFeedback(
  id: string,
  patch: {
    status?: FeedbackStatus;
    priority?: FeedbackPriority;
    assigneeId?: string | null;
    adminNote?: string | null;
  }
) {
  const sets: Prisma.Sql[] = [Prisma.sql`"updatedAt" = NOW()`];
  if (patch.status) {
    sets.push(Prisma.sql`"status" = ${patch.status}::"FeedbackStatus"`);
    sets.push(
      patch.status === "CLOSED"
        ? Prisma.sql`"resolvedAt" = NOW()`
        : Prisma.sql`"resolvedAt" = NULL`
    );
  }
  if (patch.priority) sets.push(Prisma.sql`"priority" = ${patch.priority}::"FeedbackPriority"`);
  if (patch.assigneeId !== undefined) sets.push(Prisma.sql`"assigneeId" = ${patch.assigneeId}`);
  if (patch.adminNote !== undefined) sets.push(Prisma.sql`"adminNote" = ${patch.adminNote}`);

  await prisma.$executeRaw`
    UPDATE "Feedback"
    SET ${joinSqlWithComma(sets)}
    WHERE "id" = ${id}
  `;
}
