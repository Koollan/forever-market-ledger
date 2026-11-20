import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { test, expect, servePrices, PRICES } from "./test";

// T11: goods outside the gathering tables are searchable and priced. Chunk of Boar Meat is item 769
// (Forever AH lookup, Nov 19, 2026). The recorded prices predate T11, so the test adds a Horde row for it.
const hunter = { id: "h24", name: "Ref Hunter 24", cls: "Hunter", level: 24, faction: "Horde", region: "us", gold: null,
  stretch: 2, skyborne: false, profs: [{ name: "Skinning", skill: 120 }] };
const seed = (c: object) => ({ state: { characters: [c], activeId: (c as { id: string }).id, toggles: {} }, items: {} });

test("searching 'boar' finds Chunk of Boar Meat, and its sheet shows the API price", async ({ page }) => {
  await servePrices(page);
  const recorded = JSON.parse(fs.readFileSync(fileURLToPath(new URL("../fixtures/prices/us/latest.json", import.meta.url)), "utf8"));
  recorded.series.horde.items["769"] = [40, 45, 50, 60, 1200, 90]; // min, p10, p25, median, qty, listings
  await page.route(`${PRICES}us/latest.json`, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(recorded) }));
  await page.clock.setFixedTime(new Date("2026-11-19T04:40:00Z"));
  await page.addInitScript((s) => localStorage.setItem("fml-cache", JSON.stringify(s)), seed(hunter));
  await page.goto("./");
  await page.locator('nav [data-tab="prices"]').click();
  await page.locator("#matQ").fill("boar");
  const row = page.locator('[data-mat="Chunk of Boar Meat"]').last();
  await expect(row).toContainText("Meat · tier 1");
  await row.click();
  const sheet = page.locator("#sheetPanel");
  await expect(sheet).toContainText("Chunk of Boar Meat");
  await expect(sheet).toContainText("API · 15m ago");
  await expect(sheet.locator(".stat b").first()).toHaveText("45c");
});
