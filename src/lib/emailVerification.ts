import { createHash, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendResendTransactionalEmail } from "@/lib/resendTransactionalEmail";

const CODE_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_RESENDS_PER_CODE = 5;
const MAX_VERIFY_ATTEMPTS = 5;

function getVerificationHash(code: string) {
  const salt = process.env.EMAIL_VERIFICATION_SALT?.trim() || "swapways-email-verification";
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

function generateVerificationCode() {
  const n = randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

export function getVerificationEmailText(input: { firstName: string; code: string }) {
  return [
    `Hi ${input.firstName},`,
    "",
    `Your SwapWays verification code is: ${input.code}`,
    "",
    `This code expires in ${CODE_EXPIRY_MINUTES} minutes.`,
    "If you did not request this, you can ignore this email.",
    "",
    "SwapWays Team",
  ].join("\n");
}

export async function issueEmailVerificationCode(input: {
  userId: string;
  email: string;
  firstName: string;
  forceNew?: boolean;
}) {
  const now = new Date();
  const latest = await prisma.emailVerificationCode.findFirst({
    where: { userId: input.userId, consumedAt: null, expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
  });

  if (!input.forceNew && latest) {
    const msSinceSent = now.getTime() - latest.lastSentAt.getTime();
    const msCooldown = RESEND_COOLDOWN_SECONDS * 1000;
    if (msSinceSent < msCooldown) {
      return {
        sent: false,
        reason: "COOLDOWN" as const,
        retryAfterSeconds: Math.ceil((msCooldown - msSinceSent) / 1000),
      };
    }
    if (latest.resendCount >= MAX_RESENDS_PER_CODE) {
      return { sent: false, reason: "LIMIT" as const };
    }

    const code = generateVerificationCode();
    await prisma.emailVerificationCode.update({
      where: { id: latest.id },
      data: {
        codeHash: getVerificationHash(code),
        lastSentAt: now,
        resendCount: { increment: 1 },
      },
    });
    const sentRes = await sendResendTransactionalEmail({
      to: input.email,
      subject: "Verify your SwapWays account",
      text: getVerificationEmailText({ firstName: input.firstName, code }),
    });
    if (!sentRes.ok) {
      console.error("[emailVerification] Resend failed:", sentRes);
    }
    return { sent: true, reason: "RESENT" as const };
  }

  const code = generateVerificationCode();
  await prisma.emailVerificationCode.create({
    data: {
      userId: input.userId,
      codeHash: getVerificationHash(code),
      expiresAt: new Date(now.getTime() + CODE_EXPIRY_MINUTES * 60 * 1000),
      lastSentAt: now,
    },
  });
  const sentRes = await sendResendTransactionalEmail({
    to: input.email,
    subject: "Verify your SwapWays account",
    text: getVerificationEmailText({ firstName: input.firstName, code }),
  });
  if (!sentRes.ok) {
    console.error("[emailVerification] Resend failed:", sentRes);
  }
  return { sent: true, reason: "CREATED" as const };
}

export async function verifyEmailCode(input: { userId: string; code: string }) {
  const now = new Date();
  const latest = await prisma.emailVerificationCode.findFirst({
    where: { userId: input.userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return { ok: false, reason: "NOT_FOUND" as const };
  if (latest.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "EXPIRED" as const };
  if (latest.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: "ATTEMPTS_EXCEEDED" as const };
  if (latest.codeHash !== getVerificationHash(input.code)) {
    await prisma.emailVerificationCode.update({
      where: { id: latest.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "INVALID" as const };
  }

  await prisma.$transaction([
    prisma.emailVerificationCode.update({
      where: { id: latest.id },
      data: { consumedAt: now },
    }),
    prisma.user.update({
      where: { id: input.userId },
      data: { emailVerified: now },
    }),
  ]);
  return { ok: true as const };
}
