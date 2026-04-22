import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/repositories/userRepository";
import { parseScheduleFromText } from "@/services/schedule/scheduleParser";
import * as scheduleRepo from "@/repositories/scheduleRepository";
import { trackEventServer } from "@/lib/analytics/server";
import { getUserAccess } from "@/utils/featureGates";
import { grantTrialReward } from "@/services/subscription/trialRewards";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized", message: "Please sign in" }, { status: 401 });
  }

  const access = await getUserAccess(session.user.id);
  if (!access.canUploadSchedule) {
    return NextResponse.json(
      {
        error: "UPLOAD_LIMIT_REACHED",
        feature: "unlimited_uploads",
        message: "Free tier is limited to 1 schedule upload per month. Upgrade to Premium for unlimited uploads.",
      },
      { status: 403 }
    );
  }

  let rawText: string;
  let month: number;
  let year: number;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const monthParam = formData.get("month");
    const yearParam = formData.get("year");

    if (!file) {
      return NextResponse.json(
        { error: "Bad request", message: "Missing file" },
        { status: 400 }
      );
    }

    month = monthParam != null ? parseInt(String(monthParam), 10) : new Date().getMonth() + 1;
    year = yearParam != null ? parseInt(String(yearParam), 10) : new Date().getFullYear();
    if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: "Bad request", message: "Invalid month or year" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type.toLowerCase();
    const name = (file.name || "").toLowerCase();

    if (mimeType === "text/plain" || name.endsWith(".txt")) {
      rawText = buffer.toString("utf-8");
    } else if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      try {
        const pdfModule = await import("pdf-parse");
        const pdfParse = pdfModule.default ?? pdfModule;
        const data = await pdfParse(buffer);
        rawText = (data && typeof data === "object" && "text" in data ? data.text : "") || "";
      } catch {
        return NextResponse.json(
          { error: "Parse error", message: "Failed to extract text from PDF" },
          { status: 422 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Bad request", message: "Unsupported format. Use .txt or .pdf" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Bad request", message: "Invalid form data" },
      { status: 400 }
    );
  }

  if (!rawText || rawText.trim().length < 10) {
    return NextResponse.json(
      { error: "Bad request", message: "File content is empty or too short" },
      { status: 400 }
    );
  }

  const user = await findUserById(session.user.id);
  if (!user?.airline?.code) {
    return NextResponse.json(
      { error: "Forbidden", message: "User airline not found" },
      { status: 403 }
    );
  }

  try {
    const fullParsed = parseScheduleFromText(rawText, month, year);
    const parsed = {
      lineNumber: fullParsed.lineNumber,
      month: fullParsed.month,
      year: fullParsed.year,
      totalCredit: fullParsed.totalCredit,
      totalBlock: fullParsed.totalBlock,
      daysOff: fullParsed.daysOff,
      dutyPeriods: fullParsed.dutyPeriods,
      trips: fullParsed.trips,
    };

    const schedule = await scheduleRepo.createScheduleFromParsed(
      session.user.id,
      parsed,
      rawText
    );

    const legCount = parsed.trips.reduce((sum, t) => sum + t.legs.length, 0);

    await trackEventServer({
      eventName: "schedule_uploaded",
      userId: session.user.id,
      path: "/dashboard/schedule",
      properties: { month: parsed.month, year: parsed.year, tripCount: parsed.trips.length, legCount },
    }).catch(() => {});
    const rewardResult = await grantTrialReward({
      userId: session.user.id,
      type: "SCHEDULE_UPLOAD",
      requestedDays: 10,
      metadata: { scheduleId: schedule.id, month: parsed.month, year: parsed.year },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
      },
    });
    await trackEventServer({
      eventName: "user_schedule_verified",
      userId: session.user.id,
      path: "/dashboard/schedule",
      properties: { scheduleId: schedule.id },
    }).catch(() => {});
    if (rewardResult.granted) {
      await trackEventServer({
        eventName: "trial_extended_schedule",
        userId: session.user.id,
        path: "/dashboard/schedule",
        properties: {
          daysGranted: rewardResult.daysGranted,
          trialEndsAt: rewardResult.trialEndsAt.toISOString(),
          capped: rewardResult.capped,
        },
      }).catch(() => {});
      if (rewardResult.capped) {
        await trackEventServer({
          eventName: "trial_capped_50_days",
          userId: session.user.id,
          path: "/dashboard/schedule",
          properties: { trigger: "SCHEDULE_UPLOAD" },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      data: {
        scheduleId: schedule.id,
        month: parsed.month,
        year: parsed.year,
        lineNumber: parsed.lineNumber,
        tripCount: parsed.trips.length,
        legCount,
        trialReward: rewardResult,
      },
      error: null,
      message: "Schedule uploaded successfully",
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error("Failed to parse schedule");
    const message = err.message;
    const stack = process.env.NODE_ENV === "development" ? (err as Error).stack : undefined;
    return NextResponse.json(
      { error: "Parse error", message, ...(stack && { stack }) },
      { status: 422 }
    );
  }
}
