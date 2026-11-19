import { test, expect, servePrices } from "./test";
import { boxes, columnsOf, openAs } from "./layout";
import { CHARACTERS } from "../fixtures/reference";

const [rogue15, hunter24] = CHARACTERS;

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

  test.describe("sheets", () => {
    for (const width of [768, 1280]) {
      test.describe(`at ${width}px`, () => {
        test.use({ viewport: { width, height: 900 } });

        test("open as centred dialogs and still close", async ({ page }) => {
          await page.goto("./");
          const centred = async () => {
            const [p] = await boxes(page, "#sheetPanel");
            expect(p.width).toBeLessThanOrEqual(560);
            expect(Math.abs(p.x - (width - p.x - p.width))).toBeLessThanOrEqual(2);
            expect(Math.abs(p.y - (900 - p.y - p.height))).toBeLessThanOrEqual(2);
            expect(p.height).toBeLessThanOrEqual(900 * 0.85 + 1);
          };
          await page.locator(`nav [data-tab="prices"]`).click();
          await page.locator("main [data-mat]").first().click();
          await centred();
          await page.keyboard.press("Escape");
          await expect(page.locator("#sheet")).not.toHaveClass(/open/);

          await page.locator("#charBtn").click();
          await centred();
          await page.locator('#sheet [data-act="editChar"]').first().click();
          await centred();
          await page.mouse.click(10, 450); // the backdrop, left of the dialog
          await expect(page.locator("#sheet")).not.toHaveClass(/open/);
        });
      });
    }
  });

  test.describe("at 1920px", () => {
    test.use({ viewport: { width: 1920, height: 1000 } });
    test("content is capped at 1200px and centred beside the sidebar", async ({ page }) => {
      await page.goto("./");
      const [card] = await boxes(page, "main > .lanes");
      const [main] = await boxes(page, "main");
      expect(card.width).toBeLessThanOrEqual(1200);
      const left = card.x - main.x, right = main.x + main.width - (card.x + card.width);
      expect(Math.abs(left - right)).toBeLessThanOrEqual(20); // the scrollbar may take a few pixels
    });
  });
});

const cards = (page: import("@playwright/test").Page) => boxes(page, "main section.card");

test.describe("Today", () => {
  test.describe("at 1280px", () => {
    test.use({ viewport: { width: 1280, height: 900 } });
    test("Conditions, Do this and Your materials sit side by side", async ({ page }) => {
      await openAs(page, rogue15, "today");
      const bs = await cards(page);
      expect(bs).toHaveLength(3);
      expect(columnsOf(bs)).toBe(3);
      expect(new Set(bs.map((b) => Math.round(b.y))).size).toBe(1);
    });
  });
  test.describe("at 768px", () => {
    test.use({ viewport: { width: 768, height: 900 } });
    test("Do this sits right of Conditions, Your materials under Conditions", async ({ page }) => {
      await openAs(page, rogue15, "today");
      const [cond, todo, mats] = await cards(page);
      expect(todo.x).toBeGreaterThan(cond.x + cond.width - 1);
      expect(Math.round(todo.y)).toBe(Math.round(cond.y));
      expect(Math.round(mats.x)).toBe(Math.round(cond.x));
      expect(mats.y).toBeGreaterThan(cond.y + cond.height - 1);
    });
  });
});

test.describe("Prices", () => {
  async function withMarket(page: import("@playwright/test").Page) {
    await servePrices(page);
    await page.clock.setFixedTime(new Date("2026-11-19T04:40:00Z"));
    await page.addInitScript((c) => localStorage.setItem("fml-cache", JSON.stringify({ state: { characters: [c], activeId: c.id, toggles: {} }, items: {} })), hunter24);
    await page.goto("./");
    await page.locator('nav [data-tab="prices"]').click();
    await expect(page.locator("section.market")).toBeVisible();
  }
  test.describe("at 1280px", () => {
    test.use({ viewport: { width: 1280, height: 900 } });
    test("Your prices, Market and Find sit in three columns", async ({ page }) => {
      await withMarket(page);
      const bs = await cards(page);
      expect(bs).toHaveLength(3);
      expect(columnsOf(bs)).toBe(3);
    });
    test("two columns when there is no Market", async ({ page }) => {
      await openAs(page, hunter24, "prices");
      const bs = await cards(page);
      expect(bs).toHaveLength(2);
      expect(columnsOf(bs)).toBe(2);
    });
  });
  test.describe("at 768px", () => {
    test.use({ viewport: { width: 768, height: 900 } });
    test("Market sits under Your prices, Find on the right", async ({ page }) => {
      await withMarket(page);
      const [mine, market, find] = await cards(page);
      expect(Math.round(market.x)).toBe(Math.round(mine.x));
      expect(market.y).toBeGreaterThan(mine.y + mine.height - 1);
      expect(find.x).toBeGreaterThan(mine.x + mine.width - 1);
      expect(Math.round(find.y)).toBe(Math.round(mine.y));
    });
  });
});
