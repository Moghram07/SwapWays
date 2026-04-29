import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    expired: 0,
    users: 0,
    message: "Free beta mode enabled. Trial expiration is disabled.",
  });
}
