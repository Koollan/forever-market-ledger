import { test, expect } from "./test";
import { WIDTHS, boxes, columnsOf } from "./layout";

// Screenshots of every tab and sheet at each width in WIDTHS, light and dark, for a person to review on each PR.
// They are saved as files, not compared: the behavior lock (tab text and engine outputs) is the exact check.
const TABS = ["today", "farm", "prices", "skills", "plan"] as const;

async function noOverflow(page: import("@playwright/test").Page, width: number) {
  // Nothing may push the page wider than the screen (the old one-letter-per-line squeeze bug)
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(w).toBeLessThanOrEqual(width);
}

for (const width of WIDTHS) {
  for (const scheme of ["light", "dark"] as const) {
    test.describe(`${scheme} mode at ${width}px`, () => {
      test.use({ colorScheme: scheme, viewport: { width, height: 900 } });

      for (const tab of TABS) {
        const name = width === 412 ? `${tab} tab fits a 412px phone` : `${tab} tab at ${width}px`;
        test(name, async ({ page }, info) => {
          const errors: string[] = [];
          page.on("pageerror", (e) => errors.push(e.message));
          await page.goto("./");
          await page.locator(`nav [data-tab="${tab}"]`).click();
          await expect(page.locator(`nav [data-tab="${tab}"]`)).toHaveAttribute("aria-current", "page");
          await noOverflow(page, width);
          expect(errors).toEqual([]);
          await page.screenshot({ path: info.outputPath(`${tab}-${width}-${scheme}.png`), fullPage: true });
        });
      }

      test(`sheets at ${width}px`, async ({ page }, info) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto("./");
        await page.locator(`nav [data-tab="prices"]`).click();
        await page.locator("main [data-mat]").first().click();
        await expect(page.locator("#sheet")).toHaveClass(/open/);
        await noOverflow(page, width);
        await page.screenshot({ path: info.outputPath(`sheet-material-${width}-${scheme}.png`) });
        await page.locator('#sheet [data-act="close"]').click();
        await page.locator("#charBtn").click();
        await page.screenshot({ path: info.outputPath(`sheet-characters-${width}-${scheme}.png`) });
        await page.locator('#sheet [data-act="editChar"]').first().click();
        await noOverflow(page, width);
        await page.screenshot({ path: info.outputPath(`sheet-edit-${width}-${scheme}.png`) });
        expect(errors).toEqual([]);
      });
    });
  }
}

test.describe("phone layout at 412px", () => {
  for (const tab of TABS) {
    test(`${tab}: one column of cards above a bottom tab bar`, async ({ page }) => {
      await page.goto("./");
      await page.locator(`nav [data-tab="${tab}"]`).click();
      expect(columnsOf(await boxes(page, "main section.card"))).toBe(1);
      const [nav] = await boxes(page, "nav");
      expect(Math.round(nav.y + nav.height)).toBe(900);
      expect(Math.round(nav.width)).toBe(412);
    });
  }
});
