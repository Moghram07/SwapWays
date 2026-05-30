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

test("debug5 - intercept JS chunks and check what's loaded", async ({ context, page }) => {
  const jsRequests: string[] = [];

  await setAuthCookie(context);

  // Intercept all JS requests to log them
  await page.route("**/*.js", async (route) => {
    const url = route.request().url();
    if (url.includes("add-trade") || url.includes("chunks")) {
      jsRequests.push(url);
    }
    await route.continue();
  });

  await page.route("**/api/user/base", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: { baseAirportCode: "RUH" } }) })
  );
  await page.route("**/api/schedule/my-trips", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [] }) })
  );

  await page.goto(`${BASE}/dashboard/add-trade?type=manual`);
  await page.waitForSelector("text=WHAT I'M OFFERING", { timeout: 15000 });
  await page.waitForTimeout(1000);

  console.log("JS requests intercepted:");
  jsRequests.forEach((url) => console.log(" ", url));

  // Check if the loaded add-trade chunk has setStep
  const chunkContent = await page.evaluate(async () => {
    try {
      const resp = await fetch("/_next/dev/static/chunks/app/dashboard/add-trade/page.js");
      const text = await resp.text();
      const hasSetStep = text.includes("setStep");
      const hasVoidHandleSubmit = text.includes("void handleSubmit");
      const onNextPart = text.match(/onNext:\s*\(\)=>[^,}]+/)?.[0] ?? "not found";
      return { hasSetStep, hasVoidHandleSubmit, onNextPart };
    } catch (e: unknown) {
      return { error: String(e) };
    }
  });
  console.log("Chunk analysis:", JSON.stringify(chunkContent, null, 2));
});
