// Market rules: which price is active, estimates from API prices, history, Blackwater hint, staleness
import { describe, expect, it } from "vitest";
import { activePrice, asOf, blackwaterHint, history, homeSeries, type Market } from "../../src/engine/market";
import { estimate } from "../../src/engine/estimate";
import { shiftAt } from "../../src/engine/conditions";
import type { Character, Items } from "../../src/engine/types";
import type { HourlyFile, Latest } from "../../src/pipeline/files";

const PEACEBLOOM = 2447;
const horde: Character = { id: "h", name: "Hunter", cls: "Hunter", level: 24, faction: "Horde", region: "us", profs: [] };
const alliance: Character = { ...horde, faction: "Alliance" };
const eu: Character = { ...horde, region: "eu" };
const at = (iso: string) => Date.parse(iso);

// latest.json with one row per series for Peacebloom: [min, p10, p25, median, qty, listings]
function latest(ts: string, rows: Partial<Record<"alliance" | "horde" | "blackwater" | "all", number[] | null>>): Latest {
  const entry = (row: number[] | null | undefined) => ({ ts, houses: 5, items: (row === undefined ? {} : { [PEACEBLOOM]: row }) as Record<number, number[] | null> });
  return {
    v: 1, region: "us", ts, generated_at: ts, snapshots: {}, fields: ["min", "p10", "p25", "median", "qty", "listings"],
    series: { alliance: entry(rows.alliance), horde: entry(rows.horde), blackwater: entry(rows.blackwater), all: entry(rows.all) },
  };
}
const market = (l: Latest | null): Market => ({ latest: l, hourly: {} });
const manual = (...hist: [string, number][]): Items =>
  ({ "item~peacebloom": { key: "item~peacebloom", name: "Peacebloom", hist: hist.map(([t, price]) => ({ t: at(t), price })) } });

describe("homeSeries", () => {
  it("is the character's faction house, and none for EU (API prices are US only)", () => {
    expect(homeSeries(horde)).toBe("horde");
    expect(homeSeries(alliance)).toBe("alliance");
    expect(homeSeries({ ...horde, region: undefined })).toBe("horde"); // characters saved before regions default to US
    expect(homeSeries(eu)).toBeNull();
  });
});

describe("activePrice", () => {
  const api = market(latest("2026-11-20T15:00:00Z", { horde: [20, 32, 40, 60, 100, 10], alliance: [25, 44, 50, 70, 90, 9] }));
  const now = at("2026-11-20T15:40:00Z");

  it("is the home faction's p10 from the API", () => {
    expect(activePrice("Peacebloom", { items: {}, market: api, character: horde, now }))
      .toEqual({ price: 32, source: "api", at: at("2026-11-20T15:00:00Z"), stale: false, row: [20, 32, 40, 60, 100, 10] });
    expect(activePrice("Peacebloom", { items: {}, market: api, character: alliance, now })?.price).toBe(44);
  });

  it("is your price when you entered it after the API's hour and less than 24 h ago", () => {
    expect(activePrice("Peacebloom", { items: manual(["2026-11-20T15:30:00Z", 50]), market: api, character: horde, now }))
      .toEqual({ price: 50, source: "manual", at: at("2026-11-20T15:30:00Z"), stale: false });
  });

  it("goes back to the API when your price is older than the API's hour", () => {
    expect(activePrice("Peacebloom", { items: manual(["2026-11-20T14:30:00Z", 50]), market: api, character: horde, now })?.source).toBe("api");
  });

  it("goes back to the API when your price is more than 24 h old", () => {
    const fresh = market(latest("2026-11-20T15:00:00Z", { horde: [20, 32, 40, 60, 100, 10] }));
    // your price is newer than the API hour, but 25 h old by tomorrow 16:40
    const r = activePrice("Peacebloom", { items: manual(["2026-11-20T15:30:00Z", 50]), market: fresh, character: horde, now: at("2026-11-21T16:40:00Z") });
    expect(r).toBeNull(); // and the API hour is over a day old too, so the estimate from your prices applies
    const later = market(latest("2026-11-21T16:00:00Z", { horde: [20, 32, 40, 60, 100, 10] }));
    expect(activePrice("Peacebloom", { items: manual(["2026-11-20T15:30:00Z", 50]), market: later, character: horde, now: at("2026-11-21T16:40:00Z") })?.source).toBe("api");
  });

  it("is null without an API value, so the estimate from your own prices applies as before", () => {
    const items = manual(["2026-11-18T10:00:00Z", 50]);
    expect(activePrice("Peacebloom", { items, market: null, character: horde, now })).toBeNull();
    expect(activePrice("Peacebloom", { items, market: market(latest("2026-11-20T15:00:00Z", { horde: null })), character: horde, now })).toBeNull();
    expect(activePrice("Peacebloom", { items, market: api, character: eu, now })).toBeNull();
    expect(activePrice("Not A Material", { items, market: api, character: horde, now })).toBeNull();
  });
});

describe("estimate with API prices", () => {
  const api = market(latest("2026-11-20T15:00:00Z", { horde: [20, 32, 40, 60, 100, 10] }));
  const now = at("2026-11-20T15:40:00Z");
  const mine = manual(["2026-11-18T10:00:00Z", 50], ["2026-11-19T10:00:00Z", 54]);

  it("uses the observed p10 as the price now, with one API observation", () => {
    const e = estimate("Peacebloom", {}, {}, now, { market: api, character: horde });
    expect(e?.now).toBe(32);
    expect(e?.n).toBe(1);
    expect(e?.source).toBe("api");
    expect(e?.last).toEqual({ t: at("2026-11-20T15:00:00Z"), price: 32 });
  });

  it("sets the base so conditions scale it back to the observed price now", () => {
    const e = estimate("Peacebloom", {}, {}, now, { market: api, character: horde })!;
    expect(Math.round(e.base * e.mult)).toBe(32);
    expect(e.mult).toBe(shiftAt({ name: "Peacebloom", cat: "Herb", tier: 1 }, now, {}).mult); // today's conditions
  });

  it("is exactly today's estimate from your prices without API data, for an EU character, or when your price wins", () => {
    const before = estimate("Peacebloom", mine, {}, now);
    expect(before).not.toHaveProperty("source");
    expect(estimate("Peacebloom", mine, {}, now, { market: null, character: horde })).toEqual(before);
    expect(estimate("Peacebloom", mine, {}, now, { market: api, character: eu })).toEqual(before);
    const fresh = manual(["2026-11-20T15:30:00Z", 50]);
    expect(estimate("Peacebloom", fresh, {}, now, { market: api, character: horde })).toEqual(estimate("Peacebloom", fresh, {}, now));
  });
});

describe("history", () => {
  const day = (date: string, hours: string[], rows: (number[] | null)[]): HourlyFile => ({
    v: 1, region: "us", series: "horde", date, fields: ["min", "p10", "p25", "median", "qty", "listings"],
    ts: hours.map((h) => `${date}T${h}:00:00Z`), src: hours.map(() => "bnet" as const), houses: hours.map(() => 5),
    items: { [PEACEBLOOM]: rows },
  });
  const m: Market = { latest: null, hourly: { horde: [
    day("2026-11-20", ["22", "23"], [[1, 30, 0, 0, 0, 0], [1, 31, 0, 0, 0, 0]]),
    day("2026-11-21", ["00", "02"], [[1, 33, 0, 0, 0, 0], [1, 35, 0, 0, 0, 0]]),
  ] } };

  it("gives the home series' hourly p10 up to now, oldest first, across UTC days, with gaps as null", () => {
    expect(history("Peacebloom", "horde", m, at("2026-11-21T02:40:00Z"), 5)).toEqual([30, 31, 33, null, 35]);
  });

  it("treats a non-number in a downloaded file as a missing hour", () => {
    const bad: Market = { latest: null, hourly: { horde: [day("2026-11-21", ["00", "01"], [[1, "33" as never, 0, 0, 0, 0], [1, 34, 0, 0, 0, 0]])] } };
    expect(history("Peacebloom", "horde", bad, at("2026-11-21T01:40:00Z"), 2)).toEqual([null, 34]);
  });

  it("is 24 points by default and all null with nothing loaded", () => {
    const h = history("Peacebloom", "alliance", m, at("2026-11-21T02:40:00Z"));
    expect(h).toHaveLength(24);
    expect(h.every((v) => v === null)).toBe(true);
  });
});

describe("blackwaterHint", () => {
  const with_ = (home: number, bw: number) => market(latest("2026-11-20T15:00:00Z", { horde: [0, home, 0, 0, 0, 0], blackwater: [0, bw, 0, 0, 0, 0] }));

  it("when selling, compares what you keep after each house's cut (faction 5%, Blackwater 15%)", () => {
    // home 100 → 95 kept; Blackwater 130 → 110.5 kept: 16.3% better
    const h = blackwaterHint("Peacebloom", "sell", { market: with_(100, 130), character: horde });
    expect(h?.price).toBe(111);
    expect(h?.pct).toBeCloseTo(0.1632, 4);
  });

  it("shows only when Blackwater is more than 5% better", () => {
    expect(blackwaterHint("Peacebloom", "sell", { market: with_(100, 118), character: horde })).not.toBeNull(); // 100.3 vs 95: 5.6%
    expect(blackwaterHint("Peacebloom", "sell", { market: with_(100, 117), character: horde })).toBeNull(); // 99.45 vs 95: 4.7%
  });

  it("when buying, compares prices as listed (the buyer pays no cut)", () => {
    const h = blackwaterHint("Peacebloom", "buy", { market: with_(100, 94), character: horde });
    expect(h).toEqual({ mode: "buy", price: 94, pct: expect.closeTo(0.06, 6) });
    expect(blackwaterHint("Peacebloom", "buy", { market: with_(100, 96), character: horde })).toBeNull();
  });

  it("is null for EU characters or when either house has no price", () => {
    expect(blackwaterHint("Peacebloom", "sell", { market: with_(100, 130), character: eu })).toBeNull();
    expect(blackwaterHint("Peacebloom", "sell", { market: market(latest("2026-11-20T15:00:00Z", { horde: [0, 100, 0, 0, 0, 0] })), character: horde })).toBeNull();
  });
});

describe("asOf", () => {
  const m = market(latest("2026-11-20T15:00:00Z", {}));

  it("is the newest API hour, and stale once it is more than 3 h old", () => {
    expect(asOf(m, at("2026-11-20T17:59:00Z"))).toEqual({ ts: at("2026-11-20T15:00:00Z"), stale: false });
    expect(asOf(m, at("2026-11-20T18:01:00Z"))?.stale).toBe(true);
  });

  it("is null with nothing loaded", () => {
    expect(asOf(market(null), at("2026-11-20T15:00:00Z"))).toBeNull();
  });
});

describe("review fixes: times, numbers and age of API prices", () => {
  const horde5 = { 113: "2026-11-20T15:25:17.000Z", 114: "2026-11-20T15:25:10.000Z", 115: "2026-11-20T15:24:54.000Z", 120: "2026-11-20T15:24:58.000Z", 124: "2026-11-20T15:25:00.000Z" };
  const withSnaps = (snapshots: Record<number, string>): Market => {
    const l = latest("2026-11-20T15:00:00Z", { horde: [20, 32, 40, 60, 100, 10] });
    return market({ ...l, snapshots });
  };

  it("dates API prices by Blizzard's snapshot, not the start of its hour", () => {
    const m = withSnaps(horde5);
    const now = at("2026-11-20T15:40:00Z");
    expect(activePrice("Peacebloom", { items: {}, market: m, character: horde, now })?.at).toBe(at("2026-11-20T15:25:17Z"));
    // a price you saw at 15:10 is older than the 15:25 snapshot, so the API wins; one at 15:30 is newer
    expect(activePrice("Peacebloom", { items: manual(["2026-11-20T15:10:00Z", 50]), market: m, character: horde, now })?.source).toBe("api");
    expect(activePrice("Peacebloom", { items: manual(["2026-11-20T15:30:00Z", 50]), market: m, character: horde, now })?.source).toBe("manual");
  });

  it("uses only numbers from the files: a non-number becomes null, and no p10 means no API price", () => {
    const l = latest("2026-11-20T15:00:00Z", {});
    (l.series.horde.items as Record<number, unknown>)[PEACEBLOOM] = [20, 32, 40, 60, "<img src=x>", 10];
    const r = activePrice("Peacebloom", { items: {}, market: market(l), character: horde, now: at("2026-11-20T15:40:00Z") });
    expect(r?.row).toEqual([20, 32, 40, 60, null, 10]);
    (l.series.horde.items as Record<number, unknown>)[PEACEBLOOM] = [20, "32", 40, 60, 100, 10];
    expect(activePrice("Peacebloom", { items: {}, market: market(l), character: horde, now: at("2026-11-20T15:40:00Z") })).toBeNull();
  });

  it("falls back to the file's hour when a series entry has none", () => {
    const l = latest("2026-11-20T15:00:00Z", { horde: [20, 32, 40, 60, 100, 10] });
    delete (l.series.horde as { ts?: string }).ts;
    expect(activePrice("Peacebloom", { items: {}, market: market(l), character: horde, now: at("2026-11-20T15:40:00Z") })?.at).toBe(at("2026-11-20T15:00:00Z"));
  });

  it("stops using API prices for advice once they are more than a day old", () => {
    const m = market(latest("2026-11-20T15:00:00Z", { horde: [20, 32, 40, 60, 100, 10] }));
    expect(activePrice("Peacebloom", { items: {}, market: m, character: horde, now: at("2026-11-21T14:00:00Z") })?.stale).toBe(true); // 23 h
    expect(activePrice("Peacebloom", { items: {}, market: m, character: horde, now: at("2026-11-21T16:00:00Z") })).toBeNull(); // 25 h
  });

  it("dates the header by the home series' own hour", () => {
    const l = latest("2026-11-20T08:00:00Z", {});
    l.series.horde = { ts: "2026-11-20T04:00:00Z", houses: 5, items: {} };
    expect(asOf(market(l), at("2026-11-20T08:40:00Z"), "horde")).toEqual({ ts: at("2026-11-20T04:00:00Z"), stale: true });
    expect(asOf(market(l), at("2026-11-20T08:40:00Z"), "alliance")).toEqual({ ts: at("2026-11-20T08:00:00Z"), stale: false });
  });
});
