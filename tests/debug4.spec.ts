import { test, type BrowserContext } from "@playwright/test";
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

test("debug4 - find all Preview buttons + print QuickPostForm HTML", async ({ context, page }) => {
  await setAuthCookie(context);
  await page.route("**/api/user/base", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { baseAirportCode: "RUH" } }) })
  );
  await page.route("**/api/schedule/my-trips", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
  );

  await page.goto(`${BASE}/dashboard/add-trade?type=manual`);
  await page.waitForSelector("text=WHAT I'M OFFERING", { timeout: 10000 });
  await page.waitForTimeout(600);

  // Fill form
  const leg0Input = page.locator("input[placeholder='Stop 1']").first();
  await leg0Input.click();
  await leg0Input.fill("Jeddah");
  const jedOption = page.locator("li button:has-text('JED')").first();
  await jedOption.waitFor({ timeout: 3000 });
  await jedOption.dispatchEvent("mousedown");
  await page.waitForTimeout(200);

  await page.locator("input[type='date']").first().fill("2026-07-01");
  const timeInput = page.locator("input[placeholder='20:15']").first();
  await timeInput.fill("10:30");
  await timeInput.press("Tab");
  await page.locator("button:has-text('Any flight')").first().click();

  const whereSection = page.locator("text=Where?").locator("..");
  await whereSection.locator("button").first().click();
  await page.locator("button:has-text('Anything')").first().waitFor({ timeout: 3000 });
  await page.locator("button:has-text('Anything')").first().click();
  await page.locator("button:has-text('Done')").first().click();
  await page.waitForTimeout(200);
  await page.locator("button:has-text('Select all days off')").first().click();
  await page.waitForTimeout(200);

  // Find ALL buttons with "Preview" in text
  const allPreviewBtns = await page.locator("button").all();
  console.log("ALL BUTTONS WITH PREVIEW:");
  for (const btn of allPreviewBtns) {
    const text = await btn.textContent();
    if (text?.includes("Preview")) {
      const disabled = await btn.getAttribute("disabled");
      const outerHTML = await btn.evaluate((el) => el.outerHTML.slice(0, 200));
      console.log("  Text:", JSON.stringify(text.trim()), "| disabled:", disabled, "| HTML:", outerHTML);
    }
  }

  // Also show the last part of the form (where the Preview button should be)
  const formHTML = await page.locator(".space-y-6").last().evaluate((el) => {
    const buttons = el.querySelectorAll("button");
    return Array.from(buttons).map((b) => b.outerHTML.slice(0, 200)).join("\n");
  }).catch(() => "form not found");
  console.log("Form buttons:", formHTML);
});
