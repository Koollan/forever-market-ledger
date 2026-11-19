import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { test, expect, servePrices, PRICES } from "./test";

// The material sheet with API prices (T3 step 9). Recorded files: newest hour 04:00 UTC, Nov 19, 2026.
// Light Leather (2318), Horde p10 37c, Blackwater p10 55c: selling, you keep 35.15c at home after the 5% cut
// and 46.75c at Blackwater after its 15% cut, 33% better.
const hunter = { id: "h24", name: "Ref Hunter 24", cls: "Hunter", level: 24, faction: "Horde", region: "us", gold: null,
  stretch: 2, skyborne: false, profs: [{ name: "Skinning", skill: 120 }] };
const seed = (c: object, items: object = {}) => ({ state: { characters: [c], activeId: (c as { id: string }).id, toggles: {} }, items });

async function openSheet(page: import("@playwright/test").Page, c: object, items: object, iso: string) {
  await page.clock.setFixedTime(new Date(iso));
  await page.addInitScript((s) => localStorage.setItem("fml-cache", JSON.stringify(s)), seed(c, items));
  await page.goto("./");
  await page.locator('nav [data-tab="prices"]').click();
  await page.locator("#matQ").fill("Light Leather");
  await page.locator('[data-mat="Light Leather"]').first().click();
  return page.locator("#sheetPanel");
}

test("the sheet shows the API price, its spread, a 24-hour line and the Blackwater hint", async ({ page }) => {
  await servePrices(page);
  const sheet = await openSheet(page, hunter, {}, "2026-11-19T04:40:00Z");
  await expect(sheet).toContainText("API · 40m ago");
  await expect(sheet.locator(".stat b").first()).toHaveText("37c");
  await expect(sheet).toContainText("min 25c · median 63c · 38,299 listed");
  await expect(sheet.getByRole("img", { name: "Price, last 24 hours" })).toBeVisible();
  // the line and its caption only (an old .spark rule once stretched this to 150px)
  expect((await sheet.locator("figure.pline").boundingBox())!.height).toBeLessThan(70);
  await expect(sheet.locator(".stat > div").nth(2).locator("b")).toHaveText("0"); // prices you entered, not API readings
  await expect(sheet.locator(".banner.bw")).toHaveText("Blackwater: 47c after its 15% cut, 33% better than your faction house.");
});

test("no Blackwater hint when Blackwater isn't more than 5% better", async ({ page }) => {
  await servePrices(page);
  const recorded = JSON.parse(fs.readFileSync(fileURLToPath(new URL("../fixtures/prices/us/latest.json", import.meta.url)), "utf8"));
  recorded.series.blackwater.items["2318"][1] = 40; // keeps 34c after the cut: about 3% worse than home
  await page.route(`${PRICES}us/latest.json`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(recorded) }));
  const sheet = await openSheet(page, hunter, {}, "2026-11-19T04:40:00Z");
  await expect(sheet).toContainText("API · 40m ago");
  await expect(sheet.locator(".banner.bw")).toHaveCount(0);
});

test("a price you entered after the API's hour wins, labelled as yours", async ({ page }) => {
  await servePrices(page);
  const mine = { "item~light-leather": { key: "item~light-leather", name: "Light Leather", hist: [{ t: Date.parse("2026-11-19T04:10:00Z"), price: 52 }] } };
  const sheet = await openSheet(page, hunter, mine, "2026-11-19T05:10:00Z");
  await expect(sheet).toContainText("You · 1h ago");
  await expect(sheet.locator(".stat b").first()).toHaveText("52c");
});

test("an EU character is told API prices are US only", async ({ page }) => {
  await servePrices(page);
  const sheet = await openSheet(page, { ...hunter, region: "eu" }, {}, "2026-11-19T04:40:00Z");
  await expect(sheet).toContainText("API prices are US only for now.");
  await expect(sheet).not.toContainText("API ·");
});

for (const scheme of ["light", "dark"] as const) {
  test(`the sheet with API prices fits a 412px phone (${scheme})`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme: scheme });
    await servePrices(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const sheet = await openSheet(page, hunter, {}, "2026-11-19T04:40:00Z");
    await expect(sheet.locator(".banner.bw")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath(`sheet-prices-${scheme}.png`) });
  });
}
