import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/repositories/userRepository";
import { parseScheduleFromText } from "@/services/schedule/scheduleParser";
import { detectScheduleFormat, type SchedulePdfFormat } from "@/services/schedule/detectScheduleFormat";
import { parseCalendarSchedule } from "@/services/schedule/calendarParser";
import {
  extractFullPdfTextWithPdfJs,
  extractFullPdfTextWithPdfParse,
  extractPageText,
} from "@/services/schedule/pdfTextExtract";
import * as scheduleRepo from "@/repositories/scheduleRepository";
import { trackEventServer } from "@/lib/analytics/server";
import { prisma } from "@/lib/prisma";
import { withTiming } from "@/lib/apiTimer";
import { invalidateMatchCacheForViewer } from "@/services/matching/matchEngine";
import type { ParsedSchedule } from "@/types/schedule";
import type { CalendarParseMetadata } from "@/services/schedule/calendarParser";

export const maxDuration = 60;

const UNSUPPORTED = "UNSUPPORTED_PDF_FORMAT";

function jsonUnsupported(message: string) {
  return NextResponse.json(
    {
      error: "Unsupported format",
      errorCode: UNSUPPORTED,
      message,
    },
    { status: 422 }
  );
}

export async function POST(request: Request) {
  const timer = withTiming("POST /api/schedule/upload");
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return timer.end(NextResponse.json({ error: "Unauthorized", message: "Please sign in" }, { status: 401 }));
  }

  let rawText = "";
  let month: number;
  let year: number;
  let uploadFormat: SchedulePdfFormat;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const monthParam = formData.get("month");
    const yearParam = formData.get("year");

    if (!file) {
      return timer.end(NextResponse.json(
        { error: "Bad request", message: "Missing file" },
        { status: 400 }
      ));
    }

    month = monthParam != null ? parseInt(String(monthParam), 10) : new Date().getMonth() + 1;
    year = yearParam != null ? parseInt(String(yearParam), 10) : new Date().getFullYear();
    if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return timer.end(NextResponse.json(
        { error: "Bad request", message: "Invalid month or year" },
        { status: 400 }
      ));
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type.toLowerCase();
    const name = (file.name || "").toLowerCase();

    if (mimeType === "text/plain" || name.endsWith(".txt")) {
      rawText = buffer.toString("utf-8");
      uploadFormat = detectScheduleFormat(rawText);
      if (uploadFormat === "UNKNOWN") {
        return timer.end(
          jsonUnsupported(
            "We could not recognize this schedule. Upload a CrewTool calendar export or a Saudia line schedule (.txt/.pdf)."
          )
        );
      }
    } else if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      let pageOneText: string;
      try {
        pageOneText = await extractPageText(buffer, 1);
      } catch {
        return timer.end(
          NextResponse.json(
            { error: "Parse error", message: "Failed to extract text from PDF" },
            { status: 422 }
          )
        );
      }
      uploadFormat = detectScheduleFormat(pageOneText);
      if (uploadFormat === "UNKNOWN") {
        return timer.end(
          jsonUnsupported(
            "We could not recognize this PDF. Upload a CrewTool calendar export or a Saudia line schedule PDF."
          )
        );
      }

      try {
        if (uploadFormat === "CALENDAR") {
          rawText = await extractFullPdfTextWithPdfJs(buffer);
        } else {
          rawText = await extractFullPdfTextWithPdfParse(buffer);
        }
      } catch {
        return timer.end(
          NextResponse.json(
            { error: "Parse error", message: "Failed to extract text from PDF" },
            { status: 422 }
          )
        );
      }
    } else {
      return timer.end(NextResponse.json(
        { error: "Bad request", message: "Unsupported format. Use .txt or .pdf" },
        { status: 400 }
      ));
    }
  } catch {
    return timer.end(NextResponse.json(
      { error: "Bad request", message: "Invalid form data" },
      { status: 400 }
    ));
  }

  if (!rawText || rawText.trim().length < 10) {
    return timer.end(NextResponse.json(
      { error: "Bad request", message: "File content is empty or too short" },
      { status: 400 }
    ));
  }

  const user = await findUserById(session.user.id);
  if (!user?.airline?.code) {
    return timer.end(NextResponse.json(
      { error: "Forbidden", message: "User airline not found" },
      { status: 403 }
    ));
  }

  let parsed: ParsedSchedule;
  let detectedFormat: "LINE" | "CALENDAR";
  let calendarMeta: CalendarParseMetadata = {
    reserveDayCount: 0,
    mandatoryOffCount: 0,
    deadHeadLegCount: 0,
  };

  try {
    if (uploadFormat === "CALENDAR") {
      detectedFormat = "CALENDAR";
      const cal = parseCalendarSchedule(rawText, month, year);
      parsed = cal.schedule;
      calendarMeta = cal.metadata;
    } else {
      detectedFormat = "LINE";
      const fullParsed = parseScheduleFromText(rawText, month, year);
      parsed = {
        lineNumber: fullParsed.lineNumber,
        month: fullParsed.month,
        year: fullParsed.year,
        totalCredit: fullParsed.totalCredit,
        totalBlock: fullParsed.totalBlock,
        daysOff: fullParsed.daysOff,
        dutyPeriods: fullParsed.dutyPeriods,
        trips: fullParsed.trips,
      };
    }

    const schedule = await scheduleRepo.createScheduleFromParsed(session.user.id, parsed, rawText);

    const legCount = parsed.trips.reduce((sum, t) => sum + t.legs.length, 0);
    const layoverTripCount = parsed.trips.filter((t) => (t.layovers?.length ?? 0) > 0).length;

    await trackEventServer({
      eventName: "schedule_uploaded",
      userId: session.user.id,
      path: "/dashboard/schedule",
      properties: {
        month: parsed.month,
        year: parsed.year,
        tripCount: parsed.trips.length,
        legCount,
        detectedFormat,
      },
    }).catch(() => {});
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
    await invalidateMatchCacheForViewer(session.user.id).catch(() => {});
    return timer.end(
      NextResponse.json({
        data: {
          scheduleId: schedule.id,
          month: parsed.month,
          year: parsed.year,
          lineNumber: parsed.lineNumber,
          tripCount: parsed.trips.length,
          legCount,
          detectedFormat,
          layoverTripCount,
          reserveDayCount: calendarMeta.reserveDayCount,
          mandatoryOffCount: calendarMeta.mandatoryOffCount,
          deadHeadLegCount: calendarMeta.deadHeadLegCount,
        },
        error: null,
        message: "Schedule uploaded successfully",
      })
    );
  } catch (e) {
    const err = e instanceof Error ? e : new Error("Failed to parse schedule");
    const message = err.message;
    const stack = process.env.NODE_ENV === "development" ? (err as Error).stack : undefined;
    return timer.end(
      NextResponse.json({ error: "Parse error", message, ...(stack && { stack }) }, { status: 422 })
    );
  }
}
