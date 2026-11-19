import { test, expect } from "./test";
import { boxes } from "./layout";

// Tablet (720–1099px) and desktop (≥ 1100px) layouts (T8). The 412px phone layout is checked in screens.spec.ts.
const TABS = ["today", "farm", "prices", "skills", "plan"] as const;

test.describe("shell", () => {
  for (const [width, navw] of [[768, 88], [1280, 220]] as const) {
    test.describe(`at ${width}px`, () => {
      test.use({ viewport: { width, height: 900 } });

      test("header spans the window, nav sits left of the content", async ({ page }) => {
        await page.goto("./");
        const [header] = await boxes(page, "header");
        const [nav] = await boxes(page, "nav");
        const [main] = await boxes(page, "main");
        expect(Math.round(header.width)).toBe(width);
        expect(Math.abs(nav.width - navw)).toBeLessThanOrEqual(2);
        expect(nav.x).toBe(0);
        expect(nav.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
        expect(nav.x + nav.width).toBeLessThanOrEqual(main.x + 1);
        expect(Math.round(main.y + main.height)).toBe(900);
      });

      test("tab buttons stack vertically and still switch tabs", async ({ page }) => {
        await page.goto("./");
        const bs = await boxes(page, "nav [data-tab]");
        expect(new Set(bs.map((b) => Math.round(b.x))).size).toBe(1);
        expect(new Set(bs.map((b) => Math.round(b.y))).size).toBe(5);
        for (const tab of TABS) {
          await page.locator(`nav [data-tab="${tab}"]`).click();
          await expect(page.locator(`nav [data-tab="${tab}"]`)).toHaveAttribute("aria-current", "page");
        }
      });
    });
  }

  test.describe("at 1920px", () => {
    test.use({ viewport: { width: 1920, height: 1000 } });
    test("content is capped at 1200px and centred beside the sidebar", async ({ page }) => {
      await page.goto("./");
      const [card] = await boxes(page, "main section.card");
      const [main] = await boxes(page, "main");
      expect(card.width).toBeLessThanOrEqual(1200);
      const left = card.x - main.x, right = main.x + main.width - (card.x + card.width);
      expect(Math.abs(left - right)).toBeLessThanOrEqual(20); // the scrollbar may take a few pixels
    });
  });
});
