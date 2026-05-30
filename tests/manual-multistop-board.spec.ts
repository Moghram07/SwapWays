import { test, expect, type BrowserContext } from "@playwright/test";
import { EncryptJWT } from "jose";
import { hkdf } from "@panva/hkdf";

const BASE = "http://localhost:3000";
const NEXTAUTH_SECRET = "Hri/skhT6PsJVJRmeF30Mb0ni7z6m7MidzwPdiTB2X0=";

async function createNextAuthToken(): Promise<string> {
  const key = await hkdf("sha256", NEXTAUTH_SECRET, "", "NextAuth.js Generated Encryption Key", 32);
  return new EncryptJWT({
    sub: "test-user-id",
    id: "test-user-id",
    email: "test@swapways.com",
    name: "Test User",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .encrypt(key);
}

async function setAuthCookie(context: BrowserContext) {
  const token = await createNextAuthToken();
  await context.addCookies([
    {
      name: "next-auth.session-token",
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

// The data shape the SERVER now stores for the trip the user entered:
//   JED → AHB → JED → BHH → JED  (last leg BHH→JED is a dead head)
// Crucially: `destinations` keeps the intermediate JED (base is no longer stripped),
// and `legDeadheads` is now included in the board payload.
const boardPost = {
  id: "post-multistop-1",
  userId: "test-user-id",
  postType: "OFFERING_TRIPS",
  status: "OPEN",
  offeringDaysOff: false,
  offeredDaysOff: [],
  wantType: "ANY_FLIGHT",
  wantMinLayover: null,
  wantEqualHours: false,
  wantSameDate: false,
  wantDestinations: [],
  wantExclude: [],
  wtfDays: [1, 2, 3],
  wantDaysOff: false,
  notes: null,
  createdAt: new Date().toISOString(),
  inputSource: "MANUAL_QUICK",
  user: {
    firstName: "Tester",
    rank: { name: "Captain", code: "CP" },
    base: { name: "Jeddah", airportCode: "JED" }, // name avoids the literal "JED" in the header
  },
  offeredTrips: [
    {
      flightNumber: null,
      destination: "AHB",
      destinations: ["AHB", "JED", "BHH"],
      departureDate: "2026-07-01",
      tripType: "MULTI_STOP",
      creditHours: 8,
      blockHours: 8,
      tafb: null,
      hasLayover: false,
      layoverCity: null,
      layoverHours: null,
      legLayovers: null,
      legDeadheads: [false, false, false, true],
      reportTime: "10:30",
      scheduleTrip: null,
    },
  ],
};

test.describe("Manual multi-stop through base — board rendering", () => {
  test.beforeEach(async ({ context, page }) => {
    await setAuthCookie(context);
    await page.route("**/api/swap-posts/board**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [boardPost],
          nextCursor: null,
          hasMore: false,
          includeLowMatches: true,
          boardMatchPercentThreshold: 40,
          omittedLowMatchCount: 0,
        }),
      })
    );
  });

  test("keeps the intermediate JED and shows the dead head leg", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/board?mode=flight`);

    // Wait for the offering card to render its route.
    await expect(page.getByText("Captain").first()).toBeVisible({ timeout: 15000 });

    // The route chain renders each airport code as an exact-text node.
    // Fixed route JED → AHB → JED → BHH → JED has JED exactly 3 times.
    // The old (broken) collapse JED → AHB → BHH → JED had it only twice.
    await expect.poll(
      async () => page.getByText("JED", { exact: true }).count(),
      { timeout: 15000 }
    ).toBe(3);

    await expect(page.getByText("AHB", { exact: true })).toHaveCount(1);
    await expect(page.getByText("BHH", { exact: true })).toHaveCount(1);

    // The dead head leg badge must appear (this was missing on the swaps page).
    await expect(page.getByText("Dead head leg (no duty)").first()).toBeVisible();

    console.log("✅ Route keeps intermediate JED (3 JED nodes) and shows the dead head badge");
  });
});
