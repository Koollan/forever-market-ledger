// The price pipeline's pure reduction: houses → listings → stats → series (no network)
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { SERIES, indexDiff } from "../../src/pipeline/houses.ts";
import { listingsFrom, stats } from "../../src/pipeline/reduce.ts";
import { pool } from "../../src/pipeline/series.ts";

const fixture = (name: string) => JSON.parse(readFileSync(`tests/fixtures/auctions/${name}.json`, "utf8")).body;

describe("SERIES", () => {
  const index = fixture("index").auctions as { id: number; name: string }[];

  it("puts every house in the recorded index into the faction series its name says", () => {
    for (const h of index) {
      const faction = h.name.split(" ")[0].toLowerCase(); // "Alliance Auction House" → alliance
      const homes = (["alliance", "horde", "blackwater"] as const).filter((s) => SERIES[s].includes(h.id));
      expect(homes, `house ${h.id} ${h.name}`).toEqual([faction]);
    }
  });

  it("pools all 15 houses into `all`, and nothing outside the index", () => {
    expect([...SERIES.all].sort()).toEqual(index.map((h) => h.id).sort());
    expect(SERIES.all).toHaveLength(15);
    const factionIds = [...SERIES.alliance, ...SERIES.horde, ...SERIES.blackwater].sort();
    expect(factionIds).toEqual([...SERIES.all].sort());
  });
});

describe("indexDiff", () => {
  it("finds no difference between the recorded index and the house list", () => {
    expect(indexDiff(fixture("index"), SERIES.all)).toEqual({ added: [], missing: [] });
  });

  it("names houses Blizzard added or no longer lists", () => {
    const index = { auctions: [...SERIES.all.filter((h) => h !== 112), 126].map((id) => ({ id, name: "x" })) };
    expect(indexDiff(index, SERIES.all)).toEqual({ added: [126], missing: [112] });
  });

  it("reports every known house missing from an index without houses", () => {
    expect(indexDiff({}, [110, 111]).missing).toEqual([110, 111]);
  });
});

describe("listingsFrom", () => {
  const tracked = new Set([2447, 2318]);

  it("reads commodity listings as a per-unit price and quantity", () => {
    const body = { auctions: [
      { id: 1, item: { id: 2447 }, quantity: 20, unit_price: 7999, time_left: "SHORT" },
      { id: 2, item: { id: 2447 }, quantity: 5, unit_price: 8100, time_left: "LONG" },
    ] };
    expect(listingsFrom(body, tracked).get(2447)).toEqual([{ unit: 7999, qty: 20 }, { unit: 8100, qty: 5 }]);
  });

  it("turns a regular auction's stack buyout into a per-unit price, and skips bid-only auctions", () => {
    const body = { auctions: [
      { id: 1, item: { id: 2318 }, quantity: 4, buyout: 1000 },
      { id: 2, item: { id: 2318 }, quantity: 1, bid: 560 },
    ] };
    expect(listingsFrom(body, tracked).get(2318)).toEqual([{ unit: 250, qty: 4 }]);
  });

  it("leaves out materials the app does not track", () => {
    const body = { auctions: [{ id: 1, item: { id: 3173 }, quantity: 1, unit_price: 228 }] };
    expect(listingsFrom(body, tracked).size).toBe(0);
  });

  it("treats a house with no auctions key as having no listings", () => {
    expect(listingsFrom(fixture("house-112-commodities"), tracked).size).toBe(0);
  });

  it("finds tracked materials in the recorded commodities of house 110", () => {
    const ids = new Set(Object.values(JSON.parse(readFileSync("data/items.json", "utf8"))).filter((v) => typeof v === "number") as number[]);
    const found = listingsFrom(fixture("house-110-commodities"), ids);
    // the fixture keeps 400 listings across 76 materials tracked at T3, plus 10 untracked samples; one of those,
    // Bear Meat (3173), joined the catalog in T11
    expect(found.size).toBe(77);
    expect([...found.values()].reduce((n, xs) => n + xs.length, 0)).toBe(401);
    expect(found.get(2447)?.[0]).toEqual({ unit: 7999, qty: 20 }); // Peacebloom, first listing in the file
  });
});

describe("stats", () => {
  it("weights percentiles by quantity: the cheapest price where the running total reaches p%", () => {
    // sorted: 10×1 (1), 20×2 (3), 30×1 (4), 40×6 (10); targets p10 = 1, p25 = 2.5, median = 5
    const xs = [{ unit: 30, qty: 1 }, { unit: 10, qty: 1 }, { unit: 20, qty: 2 }, { unit: 40, qty: 6 }];
    expect(stats(xs)).toEqual([10, 10, 20, 40, 10, 4]);
  });

  it("gives one listing as every percentile", () => {
    expect(stats([{ unit: 7999, qty: 20 }])).toEqual([7999, 7999, 7999, 7999, 20, 1]);
  });

  it("rounds per-unit prices from stack buyouts to whole copper", () => {
    expect(stats([{ unit: 100.4, qty: 3 }, { unit: 100.5, qty: 1 }])).toEqual([100, 100, 100, 100, 4, 2]);
  });

  it("is null with no listings", () => {
    expect(stats([])).toBeNull();
  });
});

describe("pool", () => {
  const X = 2447, Y = 2318;
  const perHouse = new Map([
    [110, new Map([[X, [{ unit: 10, qty: 1 }]]])],
    [111, new Map([[X, [{ unit: 30, qty: 3 }]]])],
    [113, new Map([[X, [{ unit: 99, qty: 9 }]]])], // a Horde house: not in the Alliance series
  ]);

  it("takes the stats of the combined listings, not an average of each house's stats", () => {
    // pooled: 10×1, 30×3 (total 4): p10 = p25 = 10, median 30; averaging the house medians would give 20
    const s = pool(perHouse, [110, 111, 112], [X, Y]);
    expect(s.items[X]).toEqual([10, 10, 10, 30, 4, 2]);
  });

  it("counts only the series' houses that were read, and lists every tracked item", () => {
    const s = pool(perHouse, [110, 111, 112], [X, Y]); // 112 was not read this run
    expect(s.houses).toBe(2);
    expect(s.items[Y]).toBeNull();
    expect(Object.keys(s.items).map(Number).sort()).toEqual([Y, X].sort());
  });

  it("counts an empty house that was read", () => {
    const withEmpty = new Map(perHouse).set(112, new Map());
    expect(pool(withEmpty, [110, 111, 112], [X]).houses).toBe(3);
  });
});
