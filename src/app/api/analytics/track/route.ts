import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { trackEventServer } from "@/lib/analytics/server";

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid JSON body", 400);

  const eventName = typeof body.eventName === "string" ? body.eventName.trim() : "";
  const path = typeof body.path === "string" ? body.path.trim() : "";
  const anonymousId = typeof body.anonymousId === "string" ? body.anonymousId.trim() : "";
  const properties =
    body.properties && typeof body.properties === "object" && !Array.isArray(body.properties)
      ? (body.properties as Record<string, unknown>)
      : {};

  if (!eventName) return error("eventName is required", 400);

  await trackEventServer({
    eventName,
    userId: session?.user?.id ?? null,
    anonymousId: anonymousId || null,
    path: path || null,
    properties,
  }).catch(() => {});

  return json({ ok: true });
}
