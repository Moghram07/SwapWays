import { test } from "@playwright/test";

test("debug - check page content", async ({ page }) => {
  // Mock session before navigation
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "test-user", email: "test@test.com", name: "Test User" },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }),
    })
  );
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

  await page.goto("http://localhost:3000/dashboard/add-trade?type=manual");
  await page.waitForTimeout(3000);
  const url = page.url();
  console.log("Final URL:", url);
  console.log("Page title:", await page.title());
  // Log visible text
  const bodyText = await page.locator("body").innerText();
  console.log("Body text (first 500):", bodyText.slice(0, 500));
});
