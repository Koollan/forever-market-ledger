import { test, expect } from "./test";

// Screenshots of every tab at 412×900, light and dark, for a person to review on each PR.
// They are saved as files, not compared: the behavior lock (tab text and engine outputs) is the exact check.
const TABS = ["today", "farm", "prices", "skills", "plan"] as const;

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    for (const tab of TABS) {
      test(`${tab} tab fits a 412px phone`, async ({ page }, info) => {
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto("./");
        await page.locator(`nav [data-tab="${tab}"]`).click();
        await expect(page.locator(`nav [data-tab="${tab}"]`)).toHaveAttribute("aria-current", "page");

        // Nothing may push the page wider than the phone (the old one-letter-per-line squeeze bug)
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(width).toBeLessThanOrEqual(412);
        expect(errors).toEqual([]);

        await page.screenshot({ path: info.outputPath(`${tab}-${scheme}.png`), fullPage: true });
      });
    }
  });
}
