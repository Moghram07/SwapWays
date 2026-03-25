import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { findAirlineByCode, findAirlineByEmailDomain } from "@/repositories/airlineRepository";
import { findUserByEmail } from "@/repositories/userRepository";
import { createUser } from "@/repositories/userRepository";
import { isValidEmail } from "@/utils/validation";
import { ensureSaudiaExists } from "@/lib/ensureSaudia";
import { trackEventServer } from "@/lib/analytics/server";

function normalizeAircraftFamily(code: string): string {
  const c = code.toUpperCase();
  if (c.startsWith("77") || c.startsWith("B777")) return "B777";
  if (c.startsWith("78") || c.startsWith("B787")) return "B787";
  if (c.startsWith("33") || c.startsWith("A330")) return "A330";
  if (c === "323" || c.startsWith("A321")) return "A321";
  if (c.startsWith("32") || c.startsWith("A320")) return "A320";
  return c;
}

export async function POST(request: Request) {
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
  if (!airline && airlineCode === "SV") {
    await ensureSaudiaExists();
    airline = await findAirlineByCode(airlineCode);
  }
  if (!airline) {
    return NextResponse.json(
      { data: null, error: "Validation failed", message: "Invalid airline" },
      { status: 422 }
    );
  }
  const normalizedEmail = email.toLowerCase().trim();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const isAdmin = !!adminEmail && normalizedEmail === adminEmail;
  const allowAnyEmail = process.env.ALLOW_ANY_EMAIL_FOR_TESTING === "true" || process.env.NODE_ENV === "development";
  if (!allowAnyEmail && !isAdmin) {
    const domainCheck = await findAirlineByEmailDomain(email.split("@")[1]);
    if (!domainCheck || domainCheck.id !== airline.id) {
      return NextResponse.json(
        { data: null, error: "Validation failed", message: "Email domain does not match airline" },
        { status: 422 }
      );
    }
  }
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
    qualifications,
  });
  await trackEventServer({
    eventName: "user_registered",
    userId: user.id,
    path: "/register",
    properties: { airlineCode },
  }).catch(() => {});
  const { passwordHash: _, ...safe } = user;
  return NextResponse.json({ data: safe, error: null, message: "Registered" });
}
