import { test, expect, servePrices } from "./test";

// API prices in the header (T3 step 8), from files recorded off the prices branch: newest hour 04:00 UTC
// on Nov 19, 2026, which is 23:00 on Nov 18 in New York (the tests' time zone).
const FRESH = "2026-11-19T04:40:00Z"; // 40 minutes after that hour
const STALE = "2026-11-19T09:00:00Z"; // 5 hours after

test("the header shows when the API prices are from", async ({ page }) => {
  await page.clock.setFixedTime(new Date(FRESH));
  await servePrices(page);
  await page.goto("./");
  await expect(page.locator("#asof")).toHaveText("prices 23:00");
  await expect(page.locator("#asof")).not.toHaveClass(/stale/);
});

test("prices more than 3 hours old read as stale", async ({ page }) => {
  await page.clock.setFixedTime(new Date(STALE));
  await servePrices(page);
  await page.goto("./");
  await expect(page.locator("#asof")).toHaveText("prices from 5 h ago");
  await expect(page.locator("#asof")).toHaveClass(/stale/);
});

test("offline, a reload shows the prices cached on this device", async ({ page }) => {
  await page.clock.setFixedTime(new Date(FRESH));
  await servePrices(page);
  await page.goto("./");
  await expect(page.locator("#asof")).toHaveText("prices 23:00");
  await page.unroute("https://raw.githubusercontent.com/**");
  await page.route("https://raw.githubusercontent.com/**", (r) => r.abort("internetdisconnected"));
  await page.reload();
  await expect(page.locator("#asof")).toHaveText("prices 23:00");
});

test("without API prices the header has no prices line", async ({ page }) => {
  await page.clock.setFixedTime(new Date(FRESH));
  await page.goto("./");
  await expect(page.locator("#charName")).not.toHaveText("Character");
  await expect(page.locator("#asof")).toHaveText("");
  await expect(page.locator("#asof")).toBeHidden();
});

for (const scheme of ["light", "dark"] as const) {
  test(`the header with prices fits a 412px phone (${scheme})`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.clock.setFixedTime(new Date(STALE));
    await servePrices(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("./");
    await expect(page.locator("#asof")).toHaveText("prices from 5 h ago");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`header-prices-${scheme}.png`) });
  });
}
