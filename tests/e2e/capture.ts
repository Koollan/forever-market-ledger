import type { Page } from "@playwright/test";
import { seedFor, type RefCharacter } from "../fixtures/reference";

const TABS = ["today", "farm", "prices", "skills", "plan"] as const;

/**
 * Loads the app as `c` at a fixed moment and returns what the behavior lock compares:
 * the visible text of every tab, and the engine's outputs for that character.
 *
 * The single-file app exposes its functions as globals. Later builds expose the same
 * names on `window.__fml` (with `now` and data passed in) so this capture keeps working.
 */
export async function capture(page: Page, c: RefCharacter, iso: string) {
  await page.clock.setFixedTime(new Date(iso));
  await page.addInitScript((seed) => {
    localStorage.setItem("fml-cache", JSON.stringify(seed));
  }, seedFor(c));
  await page.goto("/index.html");

  const text: Record<string, string> = {};
  for (const tab of TABS) {
    await page.locator(`nav [data-tab="${tab}"]`).click();
    text[tab] = await page.locator("main").innerText();
  }

  const engine = await page.evaluate(() => {
    const w = window as any;
    // eslint-disable-next-line no-eval
    const E = w.__fml ?? (0, eval)(`({char, reachZones, budgetOf, gatherOptions, bestFarm, skinSpots, zoneDossier,
      sellAdvice, needsFor, todaySuggestions, sessionPlan, shiftAt, windows, estimate, MATS, S})`);
    const c = E.char();
    const now = Date.now();
    const f = E.bestFarm(c);
    const priced = Object.values(E.S.items).map((i: any) => i.name);
    return JSON.parse(JSON.stringify({
      now,
      reachZones: E.reachZones(c).map((z: any) => z.name),
      budget: E.budgetOf(c),
      gatherOptions: E.gatherOptions(c),
      bestFarm: f && { top: f.top?.zone, ranking: f.list.map((z: any) => ({ zone: z.zone, score: z.score })) },
      dossiers: f ? f.list.slice(0, 3).map((z: any) => ({ zone: z.zone, dossier: E.zoneDossier(c, z) })) : [],
      skinSpots: E.skinSpots(c),
      sellAdvice: E.sellAdvice(c),
      needs: E.needsFor(c),
      today: E.todaySuggestions(c),
      session: Object.fromEntries([30, 60, 120].map((m) => [m, E.sessionPlan(c, m)])),
      shifts: E.MATS.map((m: any) => ({ name: m.name, mult: E.shiftAt(m, now, {}).mult,
        sell: E.shiftAt(m, now, {}, "sell").mult, buy: E.shiftAt(m, now, {}, "buy").mult })),
      estimates: Object.fromEntries(priced.map((n: string) => [n, E.estimate(n)])),
      windows: Object.fromEntries(priced.map((n: string) => {
        const m = E.MATS.find((x: any) => x.name === n);
        return [n, { sell: E.windows(m, {}, "sell", 168), buy: E.windows(m, {}, "buy", 168) }];
      })),
    }));
  });

  return { character: c.id, at: iso, text, engine };
}
