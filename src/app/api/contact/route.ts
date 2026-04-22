import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { createFeedback } from "@/repositories/feedbackRepository";
import { isValidEmail } from "@/utils/validation";
import { trackEventServer } from "@/lib/analytics/server";
import { consumeRateLimit } from "@/lib/rateLimit";

type ContactCategory = "QUESTION" | "SUGGESTION" | "BUG" | "OTHER";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function error(message: string, status: number) {
  return NextResponse.json({ data: null, error: "Error", message }, { status });
}

function json(data: unknown) {
  return NextResponse.json({ data, error: null, message: null });
}

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim();
  return ip || "unknown";
}

function normalizeCategory(value: unknown): ContactCategory | null {
  const c = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (c === "QUESTION" || c === "SUGGESTION" || c === "BUG" || c === "OTHER") return c;
  return null;
}

function mapCategoryToFeedbackType(category: ContactCategory): "QUESTION" | "SUGGESTION" | "REQUEST" {
  if (category === "QUESTION") return "QUESTION";
  if (category === "SUGGESTION") return "SUGGESTION";
  return "REQUEST";
}

export async function POST(request: Request) {
  const ipKey = getClientKey(request);
  const limitResult = await consumeRateLimit({
    namespace: "contact-submit",
    key: ipKey,
    limit: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  if (!limitResult.allowed) {
    return error("Too many submissions. Please wait a minute and try again.", 429);
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return error("Invalid JSON body", 400);

  const session = await getServerSession(authOptions);
  const category = normalizeCategory(body.category);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!category) return error("category must be QUESTION, SUGGESTION, BUG, or OTHER", 400);
  if (email && !isValidEmail(email)) return error("Invalid email format", 400);
  if (message.length < 10 || message.length > 4000) {
    return error("message must be between 10 and 4000 characters", 400);
  }
  if (subject.length > 160) return error("subject must be 160 characters or fewer", 400);
  if (name.length > 80) return error("name must be 80 characters or fewer", 400);

  let feedbackId: string | null = null;
  if (session?.user?.id) {
    const feedback = await createFeedback({
      userId: session.user.id,
      type: mapCategoryToFeedbackType(category),
      subject: subject || `Website contact: ${category}`,
      message: [
        name ? `Name: ${name}` : null,
        email ? `Email: ${email}` : null,
        `Category: ${category}`,
        "",
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    });
    feedbackId = feedback?.id ?? null;
  }

  await trackEventServer({
    eventName: "contact_submitted",
    userId: session?.user?.id ?? null,
    anonymousId: session?.user?.id ? null : `${getClientKey(request)}:${email || "no-email"}`,
    path: "/contact",
    properties: {
      category,
      hasEmail: !!email,
      hasName: !!name,
      feedbackId,
      storedInFeedback: !!feedbackId,
      subject: subject || null,
      messagePreview: message.slice(0, 120),
    },
  }).catch(() => {});

  return json({
    ok: true,
    storedInFeedback: !!feedbackId,
    message: "Thanks for your message. We review every submission.",
  });
}
