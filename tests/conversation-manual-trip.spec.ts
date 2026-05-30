import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { EncryptJWT } from "jose";
import { hkdf } from "@panva/hkdf";

const BASE = "http://localhost:3000";
const NEXTAUTH_SECRET = "Hri/skhT6PsJVJRmeF30Mb0ni7z6m7MidzwPdiTB2X0=";
const CONV_ID = "conv-1";

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
    { name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" },
  ]);
}

// Owner's posted MANUAL trip (JED → MED, 16h layover) — normalized server-side into a ChatTripView.
const ownerManualView = {
  startDate: "2026-07-04",
  reportTime: "20:15",
  isManual: true,
  layovers: [{}],
  legs: [
    { flightNumber: "", departureAirport: "JED", arrivalAirport: "MED" },
    { flightNumber: "", departureAirport: "MED", arrivalAirport: "JED" },
  ],
};

function conversationDetail(viewerIsInitiator: boolean, initiatorTripView: unknown) {
  return {
    id: CONV_ID,
    status: "ACTIVE",
    swapPostId: "post-1",
    initiatorId: viewerIsInitiator ? "test-user-id" : "other-init",
    tradeOwnerId: null,
    postOwnerId: viewerIsInitiator ? "owner-id" : "test-user-id",
    offeredTripId: null,
    ownerTripView: ownerManualView,
    initiatorTripView,
    currentOfferId: null,
    initiator: { id: viewerIsInitiator ? "test-user-id" : "other-init", firstName: "Sara", rank: { name: "FO" }, base: { name: "Jeddah" } },
    postOwner: { id: viewerIsInitiator ? "owner-id" : "test-user-id", firstName: "Omar", rank: { name: "CP" }, base: { name: "Jeddah" } },
  };
}

async function mockCommon(page: Page, detail: object, capture?: { body: unknown }) {
  await page.route("**/api/profile", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { id: "test-user-id" } }) })
  );
  await page.route("**/api/notifications/announcements", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { announcements: [], unreadCount: 0 } }) })
  );
  await page.route("**/api/user/access", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { tier: "PREMIUM", canStartNewConversation: true } }) })
  );
  await page.route("**/api/schedule/my-trips", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
  );
  await page.route("**/api/swap-posts**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: [
          {
            id: "post-1",
            offeredTrips: [
              { id: "spt-1", scheduleTripId: null, flightNumber: null, destination: "MED", destinations: ["MED"], departureDate: "2026-07-04" },
            ],
          },
        ],
      }),
    })
  );
  // One handler for all /api/conversations* traffic, branching on the path.
  await page.route("**/api/conversations**", async (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    if (path === "/api/conversations") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], meta: { tier: "PREMIUM", canStartNewConversation: true } }),
      });
    }
    if (path.endsWith("/messages")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) });
    }
    if (path.endsWith("/offer-trip") && req.method() === "PATCH") {
      if (capture) capture.body = req.postDataJSON();
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { success: true } }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: detail }) });
  });
}

test.describe("Conversation trip box — manual (no-schedule) trips", () => {
  test("owner with a manual post sees their trip in the box (not 'No trip')", async ({ context, page }) => {
    await setAuthCookie(context);
    // Viewer is the post owner; their offered trip is the manual post.
    await mockCommon(page, conversationDetail(false, ownerManualView));
    await page.goto(`${BASE}/dashboard/messages?conversation=${CONV_ID}`);

    // The owner's "your trip" box should render the manual MED layover, not the empty state.
    await expect(page.getByText("MED", { exact: true }).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Report: 20:15", { exact: false }).first()).toBeVisible();
    await expect(page.getByText("No trip selected yet")).toHaveCount(0);
    console.log("✅ Owner's manual trip renders in the conversation trip box");
  });

  test("initiator can pick a manual trip from My Swaps and it PATCHes swapPostTripId", async ({ context, page }) => {
    await setAuthCookie(context);
    const capture: { body: unknown } = { body: null };
    // Viewer is the initiator with no offer yet.
    await mockCommon(page, conversationDetail(true, null), capture);
    await page.goto(`${BASE}/dashboard/messages?conversation=${CONV_ID}`);

    // Their (owner's) manual trip shows on the second box.
    await expect(page.getByText("MED", { exact: true }).first()).toBeVisible({ timeout: 15000 });

    // The initiator's own box starts empty and is clickable.
    const yourBox = page.getByText("No trip selected yet");
    await expect(yourBox).toBeVisible();
    await yourBox.click();

    // The manual posted trip appears as an option and PATCHes swapPostTripId when chosen.
    const option = page.getByRole("button", { name: /MED · 4 Jul/ });
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    await expect.poll(() => capture.body, { timeout: 5000 }).toEqual({ swapPostTripId: "spt-1" });
    console.log("✅ Initiator offered a manual My-Swaps trip via swapPostTripId");
  });
});
