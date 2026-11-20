// Process or sell (T9): routes from a material, gold kept per craft both ways, and per-character advice
import { describe, expect, it } from "vitest";
import { canMake, compareRoute, routesFrom, processOptions, routeLabel, routeNotes, PROCESS_MIN_COPPER } from "../../src/engine/process";
import { processAdvice, sellAdvice, type SugCtx } from "../../src/engine/suggestions";
import { RECIPES } from "../../src/data/recipes";
import { ITEM_ID } from "../../src/data/items";
import type { Market } from "../../src/engine/market";
import type { Character, Items } from "../../src/engine/types";

const now = Date.parse("2026-11-18T19:00:00Z"); // Wednesday 14:00 New York
const HOUR = "2026-11-18T18:00:00.000Z";

// A one-hour price file where every named material's Horde p10 is the given copper price
function market(prices: Record<string, number>): Market {
  const items = Object.fromEntries(Object.entries(prices).map(([n, p]) => [ITEM_ID[n], [p, p, p, p, 100, 10]]));
  const entry = { ts: HOUR, houses: 5, items };
  return { latest: { v: 1, region: "us", ts: HOUR, generated_at: HOUR, snapshots: {}, fields: [],
    series: { alliance: entry, horde: entry, blackwater: entry, all: entry } } as any, hourly: {} };
}
// Entered prices older than the API hour: they only make a material "held"
function held(...names: string[]): Items {
  return Object.fromEntries(names.map((n) => { const key = "item~" + n.toLowerCase().replace(/[^a-z0-9]+/g, "-"); return [key, { key, name: n, hist: [{ t: now - 864e5, price: 1 }] }]; }));
}
const char = (profs: [string, number][], level = 40, more: Partial<Character> = {}): Character =>
  ({ id: "t", name: "T", cls: "Warrior", level, faction: "Horde", region: "us", gold: null, stretch: 2, skyborne: false,
    profs: profs.map(([name, skill]) => ({ name, skill })), ...more });
const ctx = (prices: Record<string, number>, items: Items = {}): SugCtx => ({ now, items, toggles: {}, market: market(prices) });
const recipe = (out: string) => RECIPES.find((r) => r.out === out)!;
const route = (from: string, out: string, c: Character) => routesFrom(from, c).filter((r) => r.out === out);

describe("canMake", () => {
  it("needs the profession at the recipe's skill", () => {
    expect(canMake(char([["Mining", 65]]), recipe("Tin Bar"))).toBe(true);
    expect(canMake(char([["Mining", 64]]), recipe("Tin Bar"))).toBe(false);
    expect(canMake(char([["Herbalism", 300]]), recipe("Tin Bar"))).toBe(false);
  });
  it("needs level + zone reach for Blackrock Depths before Dark Iron", () => {
    expect(canMake(char([["Mining", 230]], 49), recipe("Dark Iron Bar"))).toBe(false); // 49 + 2 < 52
    expect(canMake(char([["Mining", 230]], 50), recipe("Dark Iron Bar"))).toBe(true);
    expect(canMake(char([["Mining", 230]], 49, { stretch: 3 }), recipe("Dark Iron Bar"))).toBe(true);
  });
});

describe("routesFrom", () => {
  it("smelts ore into bars and, one step further, into alloys", () => {
    const miner = char([["Mining", 170]]);
    expect([...new Set(routesFrom("Copper Ore", miner).map((r) => r.out))].sort()).toEqual(["Bronze Bar", "Copper Bar"]);
    const bronze = route("Copper Ore", "Bronze Bar", miner).find((r) => r.steps.length === 3)!;
    expect(bronze.ins).toEqual([["Copper Ore", 1], ["Tin Ore", 1]]);
    expect(bronze.n).toBe(2);
    expect(routeLabel(bronze)).toBe("Smelt 1 Copper Ore + 1 Tin Ore → 2 Bronze Bar");
    const steel = route("Iron Ore", "Steel Bar", miner)[0];
    expect(steel).toMatchObject({ ins: [["Iron Ore", 1]], vendor: [["Coal", 1]] });
  });
  it("converts leather up to two tiers, never three", () => {
    const lw = char([["Leatherworking", 300]]);
    expect([...new Set(routesFrom("Light Leather", lw).map((r) => r.out))].sort()).toEqual(["Heavy Leather", "Medium Leather"]);
    expect(route("Light Leather", "Heavy Leather", lw)[0].ins).toEqual([["Light Leather", 20]]);
    expect(routesFrom("Light Leather", char([["Leatherworking", 100]])).map((r) => r.out)).toEqual(["Medium Leather"]);
  });
  it("reaches Arcanite from Thorium Ore only with both Mining and Alchemy", () => {
    expect(route("Thorium Ore", "Arcanite Bar", char([["Mining", 260], ["Alchemy", 280]]))[0].ins).toEqual([["Thorium Ore", 1], ["Arcane Crystal", 1]]);
    expect(route("Thorium Ore", "Arcanite Bar", char([["Mining", 260]]))).toEqual([]);
    expect(route("Thorium Bar", "Arcanite Bar", char([["Alchemy", 280]]))).toHaveLength(1);
  });
});

describe("compareRoute", () => {
  const miner = char([["Mining", 150]]);
  const copper = route("Copper Ore", "Copper Bar", miner)[0];
  it("compares gold kept after the 5% cut on both sides", () => {
    const r = compareRoute(copper, miner, ctx({ "Copper Ore": 100, "Copper Bar": 300 }));
    expect(r).toMatchObject({ keepRaw: 95, keepProcess: 285, diff: 190, verdict: "process" });
    expect(r.gain).toBeCloseTo(2);
  });
  it("needs at least 1 silver more per craft", () => {
    expect(compareRoute(copper, miner, ctx({ "Copper Ore": 30, "Copper Bar": 60 })).verdict).toBe("sell");
    expect(PROCESS_MIN_COPPER).toBe(100);
  });
  it("needs more than 10% more", () => {
    const iron = route("Iron Ore", "Iron Bar", miner)[0];
    expect(compareRoute(iron, miner, ctx({ "Iron Ore": 10000, "Iron Bar": 10950 }))).toMatchObject({ keepRaw: 9500, diff: 903, verdict: "sell" });
    expect(compareRoute(iron, miner, ctx({ "Iron Ore": 10000, "Iron Bar": 11100 }))).toMatchObject({ diff: 1045, verdict: "process" });
  });
  it("counts the vial", () => {
    const alch = char([["Alchemy", 100]]);
    const wisdom = route("Briarthorn", "Elixir of Wisdom", alch)[0];
    const r = compareRoute(wisdom, alch, ctx({ Mageroyal: 200, Briarthorn: 300, "Elixir of Wisdom": 1000 }));
    expect(r).toMatchObject({ keepRaw: 760, vendorCost: 4, keepProcess: 946, diff: 186, verdict: "process" });
    expect(compareRoute(wisdom, alch, ctx({ Mageroyal: 200, Briarthorn: 300, "Elixir of Wisdom": 900 })).verdict).toBe("sell");
  });
  it("says which prices are missing", () => {
    const r = compareRoute(copper, miner, ctx({ "Copper Ore": 100 }));
    expect(r).toMatchObject({ verdict: "unpriced", missing: ["Copper Bar"], keepRaw: null, diff: null });
  });
  it("works from your own prices when there are no API prices (EU)", () => {
    const eu = char([["Mining", 150]], 40, { region: "eu" });
    const items = { ...held("Copper Ore"), ...held("Copper Bar") };
    const r = compareRoute(copper, eu, { now, items, toggles: {}, market: market({ "Copper Ore": 100, "Copper Bar": 300 }) });
    expect(r.keepRaw).toBe(r.keepProcess); // both entered at 1c: no gain, and the API was ignored
    expect(r.verdict).toBe("sell");
  });
  it("notes skill-ups, recipe sources, where and cooldowns", () => {
    const low = char([["Mining", 30]]);
    expect(compareRoute(route("Copper Ore", "Copper Bar", low)[0], low, ctx({})).skillUp).toBe(true);
    expect(compareRoute(copper, miner, ctx({})).skillUp).toBe(false);
    const both = char([["Mining", 300], ["Alchemy", 300]], 60);
    const arc = compareRoute(route("Thorium Bar", "Arcanite Bar", both)[0], both, ctx({}));
    expect(routeNotes(arc, true)).toContain("if you know the recipe (sold by Alchemist Pestlezugg, Gadgetzan)");
    expect(routeNotes(arc, false)).toEqual(["if you know the recipe", "once every 2 days (est.)", "also gives skill-ups"]); // 300 vs 275: yellow
    const di = compareRoute(route("Dark Iron Ore", "Dark Iron Bar", both)[0], both, ctx({}));
    expect(routeNotes(di, false)).toContain("at the Black Forge in Blackrock Depths");
  });
});

describe("processOptions", () => {
  it("lists the best route to each output, unpriced last", () => {
    const miner = char([["Mining", 150]]);
    const o = processOptions("Copper Ore", miner, ctx({ "Copper Ore": 100, "Tin Ore": 100, "Copper Bar": 300 }));
    expect(o.map((x) => [x.out, x.verdict])).toEqual([["Copper Bar", "process"], ["Bronze Bar", "unpriced"]]);
  });
});

describe("processAdvice", () => {
  const prices = { "Thorium Bar": 1000, "Arcane Crystal": 5000, "Arcanite Bar": 9000 };
  it("only uses inputs the character holds (no buying to craft)", () => {
    const alch = char([["Alchemy", 280]], 60);
    expect(processAdvice(alch, ctx(prices, held("Thorium Bar")))).toEqual([]);
    const a = processAdvice(alch, ctx(prices, held("Thorium Bar", "Arcane Crystal")));
    expect(a.map((x) => [x.name, x.out, x.diff])).toEqual([["Thorium Bar", "Arcanite Bar", 2850], ["Arcane Crystal", "Arcanite Bar", 2850]]);
  });
  it("picks the best route per material and sorts by gold gained", () => {
    const miner = char([["Mining", 150]]);
    const a = processAdvice(miner, ctx({ "Copper Ore": 100, "Tin Ore": 100, "Copper Bar": 150, "Tin Bar": 150, "Bronze Bar": 400 }, held("Copper Ore", "Tin Ore")));
    expect(a.map((x) => [x.name, x.out, x.ins])).toEqual([["Copper Ore", "Bronze Bar", [["Copper Ore", 1], ["Tin Ore", 1]]], ["Tin Ore", "Bronze Bar", [["Copper Ore", 1], ["Tin Ore", 1]]]]);
  });
  it("gives nothing without prices, and leaves sell advice as it was", () => {
    const miner = char([["Mining", 150]]);
    expect(processAdvice(miner, { now, items: held("Copper Ore"), toggles: {} })).toEqual([]);
    expect(sellAdvice(miner, { now, items: held("Copper Ore"), toggles: {} }).map((x) => x.name)).toEqual(["Copper Ore"]);
  });
});

describe("Today's Process card", () => {
  const miner = char([["Mining", 150]], 30);
  const prices = { "Copper Ore": 100, "Tin Ore": 100, "Copper Bar": 150, "Tin Bar": 150, "Bronze Bar": 400, "Silver Ore": 500 };
  it("lists each route once and takes its inputs off the List now card", async () => {
    const { todaySuggestions } = await import("../../src/engine/suggestions");
    const s = todaySuggestions(miner, ctx(prices, held("Copper Ore", "Tin Ore", "Silver Ore")));
    const p = s.find((x) => x.kind === "Process")!;
    expect(p.title).toBe("Process before you sell");
    expect(p.body).toBe("Smelt Copper Ore and Tin Ore into Bronze Bar: +300%, about 5s 70c more a craft. Prices are after the auction house cut and vendor reagents.");
    const sell = [...s.filter((x) => x.kind === "Sell" || x.kind === "Hold").map((x) => x.body)].join(" ");
    expect(sell).not.toMatch(/Copper Ore|Tin Ore/);
  });
  it("keeps a material on the List now / Hold cards when its route doesn't make the top two", async () => {
    const { todaySuggestions } = await import("../../src/engine/suggestions");
    // Three routes worth processing, best first: Bronze (5s 70c more), Iron Bar (3s 80c), Silver Bar (1s 90c)
    const p3 = { "Copper Ore": 100, "Tin Ore": 100, "Iron Ore": 100, "Silver Ore": 100, "Bronze Bar": 400, "Iron Bar": 500, "Silver Bar": 300 };
    const s = todaySuggestions(char([["Mining", 170]], 30), ctx(p3, held("Copper Ore", "Tin Ore", "Iron Ore", "Silver Ore")));
    const card = s.find((x) => x.kind === "Process")!.body;
    expect(card).toMatch(/Bronze Bar.*Iron Bar/);
    expect(card).not.toMatch(/Silver/);
    const sell = s.filter((x) => x.kind === "Sell" || x.kind === "Hold").map((x) => x.body).join(" ");
    expect(sell).toMatch(/Silver Ore/); // not on the Process card, so it must stay here
    expect(sell).not.toMatch(/Copper Ore|Tin Ore|Iron Ore/);
  });
  it("is absent for the reference characters (no Mining, Alchemy or Leatherworking)", async () => {
    const { todaySuggestions } = await import("../../src/engine/suggestions");
    const { CHARACTERS, PRICES } = await import("../fixtures/reference");
    for (const c of CHARACTERS) expect(todaySuggestions(c as Character, { now, items: PRICES as Items, toggles: {} }).map((x) => x.kind)).not.toContain("Process");
  });
});
