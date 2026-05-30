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

async function pickAirport(page: import("@playwright/test").Page, placeholder: string, code: string) {
  const input = page.locator(`input[placeholder='${placeholder}']`).first();
  await input.click();
  await input.fill(code);
  const option = page.locator(`li button:has-text('${code}')`).first();
  await expect(option).toBeVisible({ timeout: 3000 });
  await option.dispatchEvent("mousedown");
  await page.waitForTimeout(150);
}

test.describe("Manual multi-stop through base — form payload", () => {
  test.beforeEach(async ({ context, page }) => {
    await setAuthCookie(context);
    await page.route("**/api/user/base", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { baseAirportCode: "JED" } }),
      })
    );
    await page.route("**/api/schedule/my-trips", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
    );
  });

  test("sends JED→AHB→JED→BHH→JED with the dead head on the final leg", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/add-trade?type=manual`);
    await page.waitForSelector("text=WHAT I'M OFFERING", { timeout: 15000 });
    await page.waitForTimeout(700); // base (JED) prefill on the locked return leg

    // Build the leg chain: AHB, then JED, then BHH (final return JED is auto-locked).
    await pickAirport(page, "Stop 1", "AHB");
    await page.locator("button:has-text('+ Add leg')").first().click();
    await pickAirport(page, "Stop 2", "JED");
    await page.locator("button:has-text('+ Add leg')").first().click();
    await pickAirport(page, "Stop 3", "BHH");

    // Dead head on the final leg (BHH → JED) — the last dead-head checkbox.
    const dhCheckboxes = page.locator("input[type='checkbox'][id*='-dh']");
    await expect(dhCheckboxes).toHaveCount(4);
    await dhCheckboxes.nth(3).click();
    await expect(dhCheckboxes.nth(3)).toBeChecked();

    // Date + report time.
    await page.locator("input[type='date']").first().fill("2026-07-01");
    const timeInput = page.locator("input[placeholder='20:15']").first();
    await timeInput.fill("10:30");
    await timeInput.press("Tab");

    // Wants: Any flight + Anything destination.
    await page.locator("button:has-text('Any flight')").first().click();
    const whereSection = page.locator("text=Where?").locator("..");
    await whereSection.locator("button").first().click();
    const anythingBtn = page.locator("button:has-text('Anything')").first();
    await expect(anythingBtn).toBeVisible({ timeout: 3000 });
    await anythingBtn.click();
    await page.locator("button:has-text('Done')").first().click();
    await page.waitForTimeout(150);

    // Willing to fly: select all.
    await page.locator("button:has-text('Select all days off')").first().click();
    await page.waitForTimeout(150);

    // Preview.
    const previewBtn = page.locator("button:has-text('Preview')").first();
    await expect(previewBtn).toBeEnabled();
    await previewBtn.click();
    await expect(page.locator("text=Preview your post")).toBeVisible({ timeout: 5000 });

    // The preview route chain should already show the full route (3 JED nodes).
    await expect(page.getByText("JED", { exact: true })).toHaveCount(3);

    // Intercept the POST and assert the payload carries the full route + dead head.
    const postPromise = page.waitForRequest(
      (req) => req.url().includes("/api/swap-posts") && req.method() === "POST"
    );
    await page.route("**/api/swap-posts", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "mock-post-id" } }),
      })
    );
    await page.locator("button:has-text('Post to Swaps')").first().click();

    const req = await postPromise;
    const body = req.postDataJSON() as {
      source: string;
      offeredTrips: { legs: { to: string; isDeadhead?: boolean }[] }[];
    };
    expect(body.source).toBe("MANUAL_QUICK");
    const legs = body.offeredTrips[0].legs;
    expect(legs.map((l) => l.to.toUpperCase())).toEqual(["AHB", "JED", "BHH", "JED"]);
    expect(legs.map((l) => !!l.isDeadhead)).toEqual([false, false, false, true]);

    console.log("✅ Form sends AHB→JED→BHH→JED legs with dead head on the final leg");
  });
});
