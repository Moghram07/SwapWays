import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

type TrackEventInput = {
  eventName: string;
  userId?: string | null;
  anonymousId?: string | null;
  path?: string | null;
  properties?: Record<string, unknown> | null;
};

function getPosthogConfig() {
  const host = process.env.POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
  const key = process.env.POSTHOG_PROJECT_API_KEY?.trim();
  return { host, key };
}

function hashIdentity(id: string) {
  const salt = process.env.ANALYTICS_HASH_SALT?.trim() || "swapways";
  return createHash("sha256").update(`${salt}:${id}`).digest("hex");
}

export function toOpaqueDistinctId(input: { userId?: string | null; anonymousId?: string | null }) {
  if (input.userId) return `u_${hashIdentity(input.userId)}`;
  if (input.anonymousId) return `a_${hashIdentity(input.anonymousId)}`;
  return `g_${randomUUID()}`;
}

export async function trackEventServer(input: TrackEventInput) {
  const distinctId = toOpaqueDistinctId({ userId: input.userId, anonymousId: input.anonymousId });
  const now = new Date();

  await prisma.$executeRaw`
    INSERT INTO "AppEvent" ("id", "userId", "anonymousId", "eventName", "path", "properties", "createdAt")
    VALUES (
      ${randomUUID()},
      ${input.userId ?? null},
      ${input.anonymousId ?? null},
      ${input.eventName},
      ${input.path ?? null},
      ${JSON.stringify({ ...(input.properties ?? {}), distinctId })}::jsonb,
      ${now}
    )
  `;

  const { host, key } = getPosthogConfig();
  if (!key) return;

  const payload = {
    api_key: key,
    event: input.eventName,
    distinct_id: distinctId,
    properties: {
      path: input.path ?? undefined,
      ...input.properties,
      source: "swapways-app",
    },
    timestamp: now.toISOString(),
  };

  await fetch(`${host.replace(/\/$/, "")}/capture/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
