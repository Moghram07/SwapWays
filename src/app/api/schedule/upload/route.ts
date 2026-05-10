import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { findUserById } from "@/repositories/userRepository";
import { parseScheduleFromText } from "@/services/schedule/scheduleParser";
import { detectScheduleFormat } from "@/services/schedule/detectScheduleFormat";
import {
  extractFullPdfTextWithPdfParse,
  textForFormatDetection,
} from "@/services/schedule/pdfTextExtract";
import * as scheduleRepo from "@/repositories/scheduleRepository";
import { trackEventServer } from "@/lib/analytics/server";
import { prisma } from "@/lib/prisma";
import { withTiming } from "@/lib/apiTimer";
import { invalidateMatchCacheForViewer } from "@/services/matching/matchEngine";
import type { ParsedSchedule } from "@/types/schedule";

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

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const monthParam = formData.get("month");
    const yearParam = formData.get("year");

    if (!file) {
      return timer.end(
        NextResponse.json({ error: "Bad request", message: "Missing file" }, { status: 400 })
      );
    }

    month = monthParam != null ? parseInt(String(monthParam), 10) : new Date().getMonth() + 1;
    year = yearParam != null ? parseInt(String(yearParam), 10) : new Date().getFullYear();
    if (Number.isNaN(month) || Number.isNaN(year) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return timer.end(
        NextResponse.json({ error: "Bad request", message: "Invalid month or year" }, { status: 400 })
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type.toLowerCase();
    const name = (file.name || "").toLowerCase();

    if (mimeType === "text/plain" || name.endsWith(".txt")) {
      rawText = buffer.toString("utf-8");
      if (detectScheduleFormat(rawText) !== "LINE") {
        return timer.end(
          jsonUnsupported(
            "We could not recognize this schedule. Upload a Saudia line schedule export (.txt or .pdf) from the crew portal."
          )
        );
      }
    } else if (mimeType === "application/pdf" || name.endsWith(".pdf")) {
      let fullPdfText: string;
      try {
        fullPdfText = await extractFullPdfTextWithPdfParse(buffer);
      } catch (e) {
        console.error("[api/schedule/upload] PDF text extraction failed", e);
        const detail = e instanceof Error ? e.message : String(e);
        return timer.end(
          NextResponse.json(
            {
              error: "Parse error",
              message: "Failed to extract text from PDF",
              ...(process.env.NODE_ENV === "development" ? { detail } : {}),
            },
            { status: 422 }
          )
        );
      }
      if (detectScheduleFormat(textForFormatDetection(fullPdfText)) !== "LINE") {
        return timer.end(
          jsonUnsupported(
            "We could not recognize this PDF. Upload a line schedule PDF from the Saudia crew portal (LINE number, credit/block, and trip rows such as #NNN REPORT)."
          )
        );
      }
      rawText = fullPdfText;
    } else {
      return timer.end(
        NextResponse.json(
          { error: "Bad request", message: "Unsupported format. Use .txt or .pdf" },
          { status: 400 }
        )
      );
    }
  } catch {
    return timer.end(NextResponse.json({ error: "Bad request", message: "Invalid form data" }, { status: 400 }));
  }

  if (!rawText || rawText.trim().length < 10) {
    return timer.end(
      NextResponse.json({ error: "Bad request", message: "File content is empty or too short" }, { status: 400 })
    );
  }

  const user = await findUserById(session.user.id);
  if (!user?.airline?.code) {
    return timer.end(NextResponse.json({ error: "Forbidden", message: "User airline not found" }, { status: 403 }));
  }

  let parsed: ParsedSchedule;

  try {
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
        detectedFormat: "LINE",
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
          detectedFormat: "LINE" as const,
          layoverTripCount,
          reserveDayCount: 0,
          mandatoryOffCount: 0,
          deadHeadLegCount: 0,
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
