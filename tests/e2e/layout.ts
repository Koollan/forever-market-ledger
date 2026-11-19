import type { Page } from "@playwright/test";
import { seedFor, type RefCharacter } from "../fixtures/reference";

export type Box = { x: number; y: number; width: number; height: number };

// Widths every tab and sheet is checked at: phone (unchanged), tablet, laptop, large desktop
export const WIDTHS = [412, 768, 1280, 1920] as const;

/** Bounding boxes of the visible elements matching `selector`, in DOM order. */
export async function boxes(page: Page, selector: string): Promise<Box[]> {
  return page.locator(selector).evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height })));
}

/** How many columns the boxes form: the number of distinct left edges (to the pixel). */
export function columnsOf(bs: Box[]): number {
  return new Set(bs.map((b) => Math.round(b.x))).size;
}

/** Load the app as `c` at a fixed moment (Wednesday 14:00 New York) and open `tab`. */
export async function openAs(page: Page, c: RefCharacter, tab = "today") {
  await page.clock.setFixedTime(new Date("2026-11-18T19:00:00Z"));
  await page.addInitScript((seed) => localStorage.setItem("fml-cache", JSON.stringify(seed)), seedFor(c));
  await page.goto("./");
  await page.locator(`nav [data-tab="${tab}"]`).click();
}
