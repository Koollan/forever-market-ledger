import { test, expect, servePrices } from "./test";

// The Prices tab's Market list (T3 step 10), on files recorded off the prices branch (newest hour 04:00 UTC,
// Nov 19, 2026). Light Leather's Horde p10 there is 37c.
const hunter = { id: "h24", name: "Ref Hunter 24", cls: "Hunter", level: 24, faction: "Horde", region: "us", gold: null,
  stretch: 2, skyborne: false, profs: [{ name: "Skinning", skill: 120 }] };

async function pricesTab(page: import("@playwright/test").Page) {
  await page.clock.setFixedTime(new Date("2026-11-19T04:40:00Z"));
  await page.addInitScript((c) => localStorage.setItem("fml-cache", JSON.stringify({ state: { characters: [c], activeId: c.id, toggles: {} }, items: {} })), hunter);
  await page.goto("./");
  await page.locator('nav [data-tab="prices"]').click();
  return page.locator("section.market");
}

test("the Market list shows API prices for what you gather, with sell advice", async ({ page }) => {
  await servePrices(page);
  const market = await pricesTab(page);
  const leather = market.locator('[data-mat="Light Leather"]');
  await expect(leather).toContainText("37c");
  await expect(leather).toContainText("API · 40m ago");
  await expect(market.locator(".pill").first()).toHaveText(/List now|Hold/);
  await leather.click();
  await expect(page.locator("#sheetPanel")).toContainText("API · 40m ago");
});

test("Today's sell advice includes what you gather once API prices are in", async ({ page }) => {
  await servePrices(page);
  await pricesTab(page);
  await page.locator('nav [data-tab="today"]').click();
  await expect(page.locator("main")).toContainText(/List now|Hold for a better window/);
});

test("no Market list without API prices", async ({ page }) => {
  const market = await pricesTab(page);
  await expect(page.locator("main")).toContainText("Your prices");
  await expect(market).toHaveCount(0);
});

for (const scheme of ["light", "dark"] as const) {
  test(`the Market list fits a 412px phone (${scheme})`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme });
    await servePrices(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const market = await pricesTab(page);
    await expect(market).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`market-${scheme}.png`), fullPage: true });
  });
}
