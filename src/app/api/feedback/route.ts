import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createFeedback, type FeedbackType } from "@/repositories/feedbackRepository";
import { trackEventServer } from "@/lib/analytics/server";

function unauthorized() {
  return NextResponse.json({ data: null, error: "Unauthorized", message: "Please sign in" }, { status: 401 });
}

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

const ALLOWED_TYPES: FeedbackType[] = ["REQUEST", "QUESTION", "SUGGESTION"];

function isFeedbackType(value: string): value is FeedbackType {
  return ALLOWED_TYPES.includes(value as FeedbackType);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid JSON body", 400);

  const typeRaw = typeof body.type === "string" ? body.type.trim().toUpperCase() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!isFeedbackType(typeRaw)) return error("type must be REQUEST, QUESTION, or SUGGESTION", 400);
  if (!message || message.length < 10) return error("message must be at least 10 characters", 400);

  const feedback = await createFeedback({
    userId: session.user.id,
    type: typeRaw,
    subject: subject || null,
    message,
  });

  if (!feedback) return error("Failed to submit feedback", 500);

  await trackEventServer({
    eventName: "feedback_submitted",
    userId: session.user.id,
    path: "/dashboard/feedback",
    properties: { type: typeRaw },
  }).catch(() => {});

  return json(feedback);
}
