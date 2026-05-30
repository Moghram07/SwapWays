import { test, expect, type BrowserContext } from "@playwright/test";
import { EncryptJWT } from "jose";
import { hkdf } from "@panva/hkdf";

const BASE = "http://localhost:3000";
const NEXTAUTH_SECRET = "Hri/skhT6PsJVJRmeF30Mb0ni7z6m7MidzwPdiTB2X0=";

async function createNextAuthToken(): Promise<string> {
  const key = await hkdf("sha256", NEXTAUTH_SECRET, "", "NextAuth.js Generated Encryption Key", 32);
  return new EncryptJWT({
    sub: "test-user-id", id: "test-user-id",
    email: "test@swapways.com", name: "Test User",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt().setExpirationTime("1d").encrypt(key);
}

async function setAuthCookie(context: BrowserContext) {
  const token = await createNextAuthToken();
  await context.addCookies([{ name: "next-auth.session-token", value: token, domain: "localhost", path: "/", httpOnly: true, secure: false, sameSite: "Lax" }]);
}

test("debug - what happens after clicking Preview", async ({ context, page }) => {
  await setAuthCookie(context);
  await page.route("**/api/user/base", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { baseAirportCode: "RUH" } }) })
  );
  await page.route("**/api/schedule/my-trips", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
  );

  let apiCalled = false;
  await page.route("**/api/swap-posts", (route) => {
    apiCalled = true;
    console.log("⚠️  swap-posts API was called!");
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { id: "mock" } }) });
  });

  await page.goto(`${BASE}/dashboard/add-trade?type=manual`);
  await page.waitForSelector("text=WHAT I'M OFFERING", { timeout: 10000 });
  await page.waitForTimeout(600);

  // Fill first leg
  const leg0Input = page.locator("input[placeholder='Stop 1']").first();
  await leg0Input.click();
  await leg0Input.fill("Jeddah");
  const jedOption = page.locator("li button:has-text('JED')").first();
  await expect(jedOption).toBeVisible({ timeout: 3000 });
  await jedOption.dispatchEvent("mousedown");
  await page.waitForTimeout(200);

  // Date + time
  await page.locator("input[type='date']").first().fill("2026-07-01");
  const timeInput = page.locator("input[placeholder='20:15']").first();
  await timeInput.fill("10:30");
  await timeInput.press("Tab");

  // Want type
  await page.locator("button:has-text('Any flight')").first().click();

  // Open destinations modal and click Anything → Done
  const whereSection = page.locator("text=Where?").locator("..");
  await whereSection.locator("button").first().click();
  const anythingBtn = page.locator("button:has-text('Anything')").first();
  await expect(anythingBtn).toBeVisible({ timeout: 3000 });
  await anythingBtn.click();
  await page.locator("button:has-text('Done')").first().click();
  await page.waitForTimeout(200);

  // Select all willing-to-fly days
  await page.locator("button:has-text('Select all days off')").first().click();
  await page.waitForTimeout(200);

  // Check validation list - should be empty
  const missingList = await page.locator("ul li").allTextContents();
  console.log("Validation items:", missingList);

  // Preview button state
  const previewBtn = page.locator("button:has-text('Preview')").first();
  const disabled = await previewBtn.getAttribute("disabled");
  console.log("Preview button disabled attr:", disabled);

  // Click preview
  await previewBtn.click();
  await page.waitForTimeout(1000);

  const url = page.url();
  const bodyText = await page.locator("body").innerText().catch(() => "");
  console.log("URL after click:", url);
  console.log("Body text after click (first 300):", bodyText.slice(0, 300));
  console.log("API was called:", apiCalled);
});
