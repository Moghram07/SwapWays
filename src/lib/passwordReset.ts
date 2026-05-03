import { createHash, randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findUserByEmail } from "@/repositories/userRepository";
import { sendResendTransactionalEmail } from "@/lib/resendTransactionalEmail";
import { DEFAULT_LOCALE, type Locale, isLocale } from "@/i18n/config";

const RESET_EXPIRY_MS = 60 * 60 * 1000;
const RESET_COOLDOWN_MS = 60 * 1000;

export type RequestPasswordResetError =
  | "EMAIL_FAILED"
  | "MISSING_EMAIL_CONFIG"
  | "RESEND_REJECTED"
  | "MISSING_PUBLIC_BASE";

function hashResetToken(token: string): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim() || "";
  return createHash("sha256").update(`${secret}:pwd-reset:${token}`).digest("hex");
}

function resetEmailLocale(raw: string | undefined): Locale {
  if (raw && isLocale(raw)) return raw;
  return DEFAULT_LOCALE;
}

/** Absolute site URL for links inside emails (Resend / clients need https). */
export function getPublicAppBaseUrl(): string {
  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!raw) return "";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/$/, "");
}

function buildResetEmailText(input: { firstName: string; resetUrl: string }): string {
  return [
    `Hi ${input.firstName},`,
    "",
    "We received a request to reset your SwapWays password.",
    "",
    "Open this link to choose a new password (valid for 1 hour):",
    input.resetUrl,
    "",
    "If you did not request this, you can ignore this email. Your password will not change.",
    "",
    "SwapWays Team",
  ].join("\n");
}

/**
 * Starts a password reset if the account exists. Returns generic success when the account does not
 * exist (avoid email enumeration). Returns an error when the user exists but email could not be sent.
 */
export type RequestPasswordResetResult =
  | { sent: true }
  | { sent: false; error: RequestPasswordResetError; resendDetail?: string };

export async function requestPasswordResetEmail(
  email: string,
  opts?: { locale?: string }
): Promise<RequestPasswordResetResult> {
  const normalized = email.toLowerCase().trim();
  const user = await findUserByEmail(normalized);
  if (!user) {
    return { sent: true };
  }

  const base = getPublicAppBaseUrl();
  if (!base) {
    console.error(
      "[password-reset] Missing NEXTAUTH_URL / NEXT_PUBLIC_APP_URL / VERCEL_URL — cannot build reset link (Resend is not called)."
    );
    return { sent: false, error: "MISSING_PUBLIC_BASE" };
  }

  const now = new Date();
  const recentDelivered = await prisma.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      sentAt: { gt: new Date(now.getTime() - RESET_COOLDOWN_MS) },
    },
    orderBy: { sentAt: "desc" },
  });
  if (recentDelivered) {
    return { sent: true };
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(token);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(now.getTime() + RESET_EXPIRY_MS),
    },
  });

  const loc = resetEmailLocale(opts?.locale);
  const resetUrl = `${base}/${loc}/reset-password?token=${encodeURIComponent(token)}`;

  const sendResult = await sendResendTransactionalEmail({
    to: user.email,
    subject: "Reset your SwapWays password",
    text: buildResetEmailText({ firstName: user.firstName, resetUrl }),
  });

  if (!sendResult.ok) {
    await prisma.passwordResetToken.deleteMany({ where: { tokenHash } });
    if (sendResult.reason === "MISSING_EMAIL_CONFIG") {
      return { sent: false, error: "MISSING_EMAIL_CONFIG" };
    }
    return {
      sent: false,
      error: "RESEND_REJECTED",
      resendDetail: sendResult.detail,
    };
  }

  await prisma.passwordResetToken.update({
    where: { tokenHash },
    data: { sentAt: new Date() },
  });

  return { sent: true };
}

export type ResetPasswordWithTokenResult = { ok: true } | { ok: false; reason: "INVALID" | "SHORT" };

export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<ResetPasswordWithTokenResult> {
  const trimmed = token.trim();
  if (!trimmed) return { ok: false, reason: "INVALID" };
  if (newPassword.length < 8) return { ok: false, reason: "SHORT" };

  const tokenHash = hashResetToken(trimmed);
  const now = new Date();
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });
  if (!row || row.usedAt != null || row.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "INVALID" };
  }

  const passwordHash = await hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: now },
    }),
  ]);

  return { ok: true };
}
