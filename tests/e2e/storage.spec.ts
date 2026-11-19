import { test, expect } from "@playwright/test";

// Data saved by the single-file app (T1) lives in localStorage under "fml-cache". The split app must
// load it unchanged, and keep saving in the same place and shape.
const saved = {
  state: {
    characters: [
      { id: "k2x9", name: "Morwen", cls: "Druid", level: 33, faction: "Horde", region: "us", gold: 420000,
        stretch: 3, skyborne: false, profs: [{ name: "Herbalism", skill: 160 }, { name: "Alchemy", skill: 140 }] },
      { id: "p7q1", name: "Alt", cls: "Mage", level: 12, faction: "Horde", region: "us", gold: null,
        stretch: 2, skyborne: false, profs: [] },
    ],
    activeId: "k2x9",
    toggles: {},
  },
  items: {
    "item~kingsblood": { key: "item~kingsblood", name: "Kingsblood", hist: [{ t: 1795000000000, price: 640 }] },
  },
};

test("characters and prices saved by the single-file app load unchanged", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-11-18T19:00:00Z"));
  await page.addInitScript((s) => localStorage.setItem("fml-cache", JSON.stringify(s)), saved);
  await page.goto("./");

  await expect(page.locator("#charName")).toContainText("Morwen");
  await page.locator('nav [data-tab="prices"]').click();
  await expect(page.locator("main")).toContainText("Kingsblood");

  // Switching character saves to the same key, in the same shape
  await page.locator("#charBtn").click();
  await page.locator('[data-act="useChar"][data-id="p7q1"]').click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("fml-cache")!));
  expect(stored.state.activeId).toBe("p7q1");
  expect(stored.state.characters).toEqual(saved.state.characters);
  expect(stored.items).toEqual(saved.items);
});

test("Backup in the split app still exports and re-imports exactly", async ({ page }) => {
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("fml-cache", JSON.stringify(s));
      sessionStorage.setItem("seeded", "1");
    }
  }, saved);
  await page.goto("./");
  await page.locator("#charBtn").click();
  await page.locator('[data-act="exportData"]').click();
  const exported = await page.locator("#bkOut").inputValue();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator("#charName")).toContainText("Example rogue");

  await page.locator("#charBtn").click();
  await page.locator("#bkIn").fill(exported);
  await page.locator('[data-act="checkImport"]').click();
  await expect(page.locator("#bkConfirm")).toContainText("Replace with 2 characters and 1 price?");
  await page.locator('[data-act="applyImport"]').click();
  await expect(page.locator("#charName")).toContainText("Morwen");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("fml-cache")!));
  expect(stored).toEqual(saved);
});
