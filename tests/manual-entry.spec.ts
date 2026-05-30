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

test.describe("Manual entry — dead head and preview fixes", () => {
  test.beforeEach(async ({ context, page }) => {
    await setAuthCookie(context);
    await page.route("**/api/user/base", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { baseAirportCode: "RUH" } }),
      })
    );
    await page.route("**/api/schedule/my-trips", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      })
    );
  });

  test("1 - dead head checkbox stays checked after clicking", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/add-trade?type=manual`);
    await page.waitForSelector("text=WHAT I'M OFFERING", { timeout: 10000 });
    await page.waitForTimeout(600);

    const dhCheckbox = page.locator("input[type='checkbox'][id*='-dh']").first();
    await expect(dhCheckbox).toBeVisible();
    await expect(dhCheckbox).not.toBeChecked();

    await dhCheckbox.click();
    await expect(dhCheckbox).toBeChecked();
    await page.waitForTimeout(300);
    await expect(dhCheckbox).toBeChecked();

    console.log("✅ Dead head checkbox stays checked after clicking");
  });

  test("2 - clicking Preview → shows preview page not direct submit", async ({ page }) => {
    await page.goto(`${BASE}/dashboard/add-trade?type=manual`);
    await page.waitForSelector("text=WHAT I'M OFFERING", { timeout: 10000 });
    await page.waitForTimeout(600); // wait for base airport RUH prefill

    // ── Fill first leg airport (JED) ─────────────────────────────
    const leg0Input = page.locator("input[placeholder='Stop 1']").first();
    await leg0Input.click();
    await leg0Input.fill("Jeddah");
    const jedOption = page.locator("li button:has-text('JED')").first();
    await expect(jedOption).toBeVisible({ timeout: 3000 });
    await jedOption.dispatchEvent("mousedown");
    await page.waitForTimeout(200);

    const leg0Val = await leg0Input.inputValue();
    expect(leg0Val).toContain("JED");

    // ── Date + report time ───────────────────────────────────────
    await page.locator("input[type='date']").first().fill("2026-07-01");
    const timeInput = page.locator("input[placeholder='20:15']").first();
    await timeInput.fill("10:30");
    await timeInput.press("Tab");

    // ── Want type: "Any flight" ──────────────────────────────────
    await page.locator("button:has-text('Any flight')").first().click();

    // ── Want destinations: open modal and select "Anything" ──────
    // Click any button inside the Where section to open the destination modal
    const whereSection = page.locator("text=Where?").locator("..");
    await whereSection.locator("button").first().click();

    // Modal should open — click the "Anything" row button
    const anythingBtn = page.locator("button:has-text('Anything')").first();
    await expect(anythingBtn).toBeVisible({ timeout: 3000 });
    await anythingBtn.click();

    // Click "Done" to apply
    const doneBtn = page.locator("button:has-text('Done')").first();
    await expect(doneBtn).toBeVisible({ timeout: 2000 });
    await doneBtn.click();
    await page.waitForTimeout(200);

    // ── Willing to fly: select all days ──────────────────────────
    const selectAllBtn = page.locator("button:has-text('Select all days off')").first();
    await expect(selectAllBtn).toBeVisible({ timeout: 3000 });
    await selectAllBtn.click();
    await page.waitForTimeout(200);

    // ── Check dead head on leg 0 ─────────────────────────────────
    const dhCheckbox = page.locator("input[type='checkbox'][id*='-dh']").first();
    await expect(dhCheckbox).toBeVisible();
    await dhCheckbox.click();
    await expect(dhCheckbox).toBeChecked();
    console.log("✅ Dead head checked");

    // ── Preview button must now be ENABLED ───────────────────────
    const previewBtn = page.locator("button:has-text('Preview')").first();
    await expect(previewBtn).toBeVisible();
    const isDisabled = await previewBtn.getAttribute("disabled");
    expect(isDisabled, "Preview button should be enabled when form is complete").toBeNull();

    // ── Mock API + click Preview ─────────────────────────────────
    await page.route("**/api/swap-posts", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { id: "mock-post-id" } }),
      })
    );

    await previewBtn.click();

    // Must show preview page — NOT navigate away
    await expect(page.locator("text=Preview your post")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("button:has-text('Post to Swaps')")).toBeVisible();
    console.log("✅ Preview page shown after clicking Preview →");

    // The dead head form should be gone (we're on preview)
    await expect(page.locator("input[type='checkbox'][id*='-dh']").first()).not.toBeVisible();

    // Back → returns to form
    await page.locator("button:has-text('← Back')").first().click();
    await expect(page.locator("text=WHAT I'M OFFERING")).toBeVisible({ timeout: 3000 });
    console.log("✅ Back button returns to form from preview");
  });
});
