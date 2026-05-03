import { NextResponse } from "next/server";
import { requireSameOrigin } from "@/lib/csrf";
import { isValidEmail } from "@/utils/validation";
import { requestPasswordResetEmail, type RequestPasswordResetError } from "@/lib/passwordReset";

/** Pull a short human line from Resend's JSON error body when present. */
function resendResponseHint(detail: string | undefined): string | undefined {
  if (!detail?.trim()) return undefined;
  try {
    const j = JSON.parse(detail) as { message?: string };
    if (typeof j.message === "string" && j.message.trim()) {
      return j.message.trim().slice(0, 400);
    }
  } catch {
    /* not JSON */
  }
  return detail.trim().slice(0, 400);
}

const GENERIC_OK_MESSAGE =
  "If that email is linked to an account, you will receive a message with reset instructions shortly. Check your inbox and spam folder.";

function errorMessageFor(code: RequestPasswordResetError): string {
  switch (code) {
    case "MISSING_EMAIL_CONFIG":
      return "Password reset email is temporarily unavailable. Please try again later or contact support.";
    case "MISSING_PUBLIC_BASE":
      return "Password reset is temporarily unavailable. Please try again later or contact support.";
    case "RESEND_REJECTED":
      return "We could not send the reset email. Please try again in a few minutes. If the problem continues, contact support.";
    default:
      return "We could not send the reset email. Please try again in a few minutes.";
  }
}

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const email = typeof (body as { email?: unknown }).email === "string" ? (body as { email: string }).email : "";
  const localeRaw =
    typeof (body as { locale?: unknown }).locale === "string" ? (body as { locale: string }).locale : undefined;

  if (!email.trim()) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Please enter your email address." },
      { status: 422 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Please enter a valid email address." },
      { status: 422 }
    );
  }

  const result = await requestPasswordResetEmail(email, { locale: localeRaw });
  if (!result.sent) {
    const baseMessage = errorMessageFor(result.error);
    if (result.error === "RESEND_REJECTED" && result.resendDetail) {
      const hint = resendResponseHint(result.resendDetail);
      console.error("[forgot-password] send failed code=RESEND_REJECTED", hint ?? "");
    } else {
      console.error(`[forgot-password] send failed code=${result.error}`);
    }
    return NextResponse.json(
      {
        data: null,
        error: "EmailError",
        code: result.error,
        message: baseMessage,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    data: { ok: true },
    error: null,
    message: GENERIC_OK_MESSAGE,
  });
}
