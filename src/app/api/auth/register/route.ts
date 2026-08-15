import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findAirlineByCode } from "@/repositories/airlineRepository";
import { findUserByEmail } from "@/repositories/userRepository";
import { createUser } from "@/repositories/userRepository";
import { isValidEmail } from "@/utils/validation";
import { ensureAirlineExists } from "@/lib/ensureAirline";
import { getAirlineConfig } from "@/config/airlines";
import { trackEventServer } from "@/lib/analytics/server";
import { requireSameOrigin } from "@/lib/csrf";
import { sendResendTransactionalEmail } from "@/lib/resendTransactionalEmail";

function normalizeAircraftFamily(code: string): string {
  const c = code.toUpperCase();
  if (c.startsWith("77") || c.startsWith("B777")) return "B777";
  if (c.startsWith("78") || c.startsWith("B787")) return "B787";
  if (c.startsWith("33") || c.startsWith("A330")) return "A330";
  if (c === "323" || c.startsWith("A321")) return "A321";
  if (c.startsWith("32") || c.startsWith("A320")) return "A320";
  return c;
}

function makeReferralCode(firstName: string): string {
  const prefix = firstName.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) || "CREW";
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}${suffix}`;
}

async function createUniqueReferralCode(firstName: string) {
  for (let i = 0; i < 10; i += 1) {
    const candidate = makeReferralCode(firstName);
    const exists = await prisma.user.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")}`;
}

export async function POST(request: Request) {
  const csrfError = requireSameOrigin(request);
  if (csrfError) return csrfError;

  const body = await request.json().catch(() => ({}));
  const {
    email,
    password,
    firstName,
    lastName,
    crewId,
    airlineCode,
    rankId,
    baseId,
    qualificationIds,
    phone,
    referralCode,
  } = body as {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    crewId?: string;
    airlineCode?: string;
    rankId?: string;
    baseId?: string;
    qualificationIds?: string[];
    phone?: string;
    referralCode?: string;
  };

  if (!email || !password || !firstName || !lastName || !crewId || !airlineCode || !rankId || !baseId) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Missing required fields" },
      { status: 422 }
    );
  }
  if (!isValidEmail(email)) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Invalid email" },
      { status: 422 }
    );
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    return NextResponse.json(
      { data: null, error: "Conflict", message: "Email already registered" },
      { status: 409 }
    );
  }
  let airline = await findAirlineByCode(airlineCode);
  if (!airline) {
    // DB was never seeded for this airline — provision it from config on first signup.
    const config = getAirlineConfig(airlineCode);
    if (config) {
      await ensureAirlineExists(config);
      airline = await findAirlineByCode(airlineCode);
    }
  }
  if (!airline) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Invalid airline" },
      { status: 422 }
    );
  }
  const normalizedEmail = email.toLowerCase().trim();
  // Never grant admin privileges from public registration.
  // Admin should be assigned via controlled back-office/DB process.
  const isAdmin = false;
  const rank = await prisma.rank.findFirst({ where: { airlineId: airline.id, code: rankId } });
  const base = await prisma.base.findFirst({ where: { airlineId: airline.id, airportCode: baseId } });
  if (!rank || !base) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Invalid rank or base" },
      { status: 422 }
    );
  }
  const passwordHash = await hash(password, 10);
  const requestedCodes = Array.isArray(qualificationIds) ? qualificationIds : [];
  const requestedFamilies = new Set(requestedCodes.map((c) => normalizeAircraftFamily(c)));
  const airlineAircraft = await prisma.aircraftType.findMany({
    where: { airlineId: airline.id },
    orderBy: { code: "asc" },
  });

  const chosenByFamily = new Map<string, { id: string }>();
  for (const at of airlineAircraft) {
    const familyFromCode = normalizeAircraftFamily(at.code);
    const familyFromSchedule = at.scheduleCode ? normalizeAircraftFamily(at.scheduleCode) : familyFromCode;
    const family = familyFromCode || familyFromSchedule;
    if (!requestedFamilies.has(family)) continue;
    if (!chosenByFamily.has(family)) {
      chosenByFamily.set(family, { id: at.id });
    }
  }

  const qualifications = Array.from(chosenByFamily.values()).map((t) => ({ aircraftTypeId: t.id }));
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const ownReferralCode = await createUniqueReferralCode(firstName);
  const normalizedReferralCode = referralCode?.trim().toUpperCase();
  const referrer =
    normalizedReferralCode && normalizedReferralCode.length > 0
      ? await prisma.user.findUnique({
          where: { referralCode: normalizedReferralCode },
          select: { id: true, email: true, trialStartedAt: true, trialEndsAt: true, referralBonusCount: true },
        })
      : null;
  const isValidReferrer = !!referrer && referrer.email.toLowerCase() !== normalizedEmail;
  const trialEndsAt = new Date(now.getTime() + 365 * dayMs);
  const user = await createUser({
    email: normalizedEmail,
    passwordHash,
    firstName,
    lastName,
    crewId,
    airlineId: airline.id,
    rankId: rank.id,
    baseId: base.id,
    phone,
    isAdmin,
    tier: "PREMIUM",
    subscriptionStatus: "ACTIVE",
    trialStartedAt: now,
    trialEndsAt,
    isVerified: false,
    trialExtended: false,
    referredBy: isValidReferrer && referrer ? referrer.id : null,
    referralCode: ownReferralCode,
    qualifications,
  });
  if (isValidReferrer && referrer) {
    await prisma.referral.create({
      data: {
        referrerUserId: referrer.id,
        referredUserId: user.id,
        bonusDays: 0,
      },
    });
    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        referralBonusCount: { increment: 1 },
      },
    });
    await trackEventServer({
      eventName: "referral_signup_linked",
      userId: referrer.id,
      path: "/register",
      properties: { referredUserId: user.id },
    }).catch(() => {});
  }
  await trackEventServer({
    eventName: "user_registered",
    userId: user.id,
    path: "/register",
    properties: { airlineCode },
  }).catch(() => {});

  sendResendTransactionalEmail({
    to: normalizedEmail,
    subject: "Welcome to SwapWays!",
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to SwapWays! Your account is ready.",
      "",
      "Here's what you can do right away:",
      "  • Post your swap request and let the match engine find compatible crew members",
      "  • Browse the board to find open swaps near your route",
      "  • Message matched crew members directly in the app",
      "",
      "If you have any questions, reply to this email or reach out through the app.",
      "",
      "Happy swapping,",
      "The SwapWays Team",
    ].join("\n"),
  }).catch(() => {});
  const safe = { ...user };
  delete (safe as { passwordHash?: string }).passwordHash;
  return NextResponse.json({
    data: { ...safe, verificationRequired: false },
    error: null,
    message: "Registered successfully.",
  });
}
