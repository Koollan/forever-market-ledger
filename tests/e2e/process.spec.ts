import { test, expect, servePrices } from "./test";

// Process or sell (T8) on the recorded price file (newest hour 04:00 UTC, Nov 19, 2026). Horde p10 there:
// Copper Ore and Tin Ore sell for less than half of the 2 Bronze Bars smelted from them, so a level 30 Horde
// miner with Mining 150 is told to smelt (keep 3s 40c vs 2s 38c, +43%).
const miner = { id: "m30", name: "Test Miner", cls: "Warrior", level: 30, faction: "Horde", region: "us", gold: null,
  stretch: 2, skyborne: false, profs: [{ name: "Mining", skill: 150 }, { name: "Alchemy", skill: 150 }] };

async function open(page: import("@playwright/test").Page, tab: string) {
  await page.clock.setFixedTime(new Date("2026-11-19T04:40:00Z"));
  await page.addInitScript((c) => localStorage.setItem("fml-cache", JSON.stringify({ state: { characters: [c], activeId: c.id, toggles: {} }, items: {} })), miner);
  await page.goto("./");
  await page.locator(`nav [data-tab="${tab}"]`).click();
}

test("the material sheet compares selling raw with what you can make", async ({ page }) => {
  await servePrices(page);
  await open(page, "prices");
  await page.locator('section.market [data-mat="Copper Ore"]').click();
  const sec = page.locator("#sheetPanel .list.process");
  const bronze = sec.locator(".item").filter({ hasText: "Bronze Bar" });
  await expect(bronze).toContainText("Smelt 1 Copper Ore + 1 Tin Ore → 2 Bronze Bar");
  await expect(bronze).toContainText("Smelt first");
  await expect(bronze).toContainText("Keep 3s 40c processed vs 2s 38c selling raw (+43%)");
  await expect(bronze).toContainText("also uses Tin Ore");
  await expect(sec.locator(".item").filter({ hasText: "→ 1 Copper Bar" })).toContainText("Sell raw");
});

test("a route with a missing price says what to price", async ({ page }) => {
  // EU: no API prices, only the Copper Ore price you entered
  const eu = { ...miner, region: "eu" };
  const items = { "item~copper-ore": { key: "item~copper-ore", name: "Copper Ore", hist: [{ t: Date.parse("2026-11-18T20:00:00Z"), price: 120 }] } };
  await page.clock.setFixedTime(new Date("2026-11-19T04:40:00Z"));
  await page.addInitScript(([c, it]) => localStorage.setItem("fml-cache", JSON.stringify({ state: { characters: [c], activeId: (c as { id: string }).id, toggles: {} }, items: it })), [eu, items] as const);
  await page.goto("./");
  await page.locator('nav [data-tab="prices"]').click();
  await page.locator('[data-mat="Copper Ore"]').first().click();
  const bar = page.locator("#sheetPanel .list.process .item").filter({ hasText: "→ 1 Copper Bar" });
  await expect(bar).toContainText("No price for Copper Bar yet: add one to compare.");
  await expect(bar).toContainText("No price");
});

test("Prices rows tag materials worth processing", async ({ page }) => {
  await servePrices(page);
  await open(page, "prices");
  await expect(page.locator('section.market [data-mat="Copper Ore"]')).toContainText("Smelt first +43%");
  await expect(page.locator('section.market [data-mat="Silver Ore"]')).not.toContainText("first");
});

test("Today shows a Process card", async ({ page }) => {
  await servePrices(page);
  await open(page, "today");
  const card = page.locator("main .item").filter({ hasText: "Process before you sell" });
  await expect(card).toContainText("Smelt Copper Ore and Tin Ore into Bronze Bar: +43%, about 1s 2c more a craft");
  await expect(card.locator(".pill")).toHaveText("Process");
});

test("no process advice without prices", async ({ page }) => {
  await open(page, "today");
  await expect(page.locator("main")).not.toContainText("Process before you sell");
});

for (const scheme of ["light", "dark"] as const) {
  test(`the process section and card fit a 412px phone (${scheme})`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme });
    await servePrices(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await open(page, "today");
    const title = page.locator("main .item .nm").filter({ hasText: "Process before you sell" });
    expect((await title.boundingBox())!.width).toBeGreaterThan(120); // the old squeeze bug: one letter per line
    await page.screenshot({ path: info.outputPath(`process-today-${scheme}.png`), fullPage: true });
    await page.locator('nav [data-tab="prices"]').click();
    await page.locator('section.market [data-mat="Copper Ore"]').click();
    const label = page.locator("#sheetPanel .list.process .nm").first();
    expect((await label.boundingBox())!.width).toBeGreaterThan(120);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`process-sheet-${scheme}.png`), fullPage: true });
  });
}
