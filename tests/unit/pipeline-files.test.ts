// The price pipeline's files: snapshot hours, hourly merge, daily roll-up, latest (no network)
import { describe, expect, it } from "vitest";
import { changed, pointHour } from "../../src/pipeline/snapshot.ts";
import { buildLatest, dayRow, mergeDaily, mergeHourly, rollDay, type HourlyFile, type Point } from "../../src/pipeline/files.ts";

describe("pointHour", () => {
  it("is the newest house snapshot, floored to the hour, in UTC", () => {
    expect(pointHour({ 110: "2026-11-19T01:25:08.000Z", 112: "2026-11-19T01:24:54.000Z" })).toBe("2026-11-19T01:00:00Z");
    expect(pointHour({ 110: "2026-11-19T23:59:59.000Z", 111: "2026-11-19T22:10:00.000Z" })).toBe("2026-11-19T23:00:00Z");
  });

  it("is null with no snapshot times", () => {
    expect(pointHour({})).toBeNull();
  });
});

describe("changed", () => {
  const prev = { 110: "2026-11-19T01:25:08.000Z", 112: "2026-11-19T01:24:54.000Z" };

  it("is false when every house read has the snapshot already stored", () => {
    expect(changed(prev, { ...prev })).toBe(false);
  });

  it("is false when a house failed this run but the others are unchanged", () => {
    expect(changed(prev, { 110: prev[110] })).toBe(false);
  });

  it("is true when any house has a new snapshot, or a house appears for the first time", () => {
    expect(changed(prev, { ...prev, 110: "2026-11-19T02:25:08.000Z" })).toBe(true);
    expect(changed(prev, { ...prev, 113: "2026-11-19T01:25:10.000Z" })).toBe(true);
  });

  it("is true on the very first run", () => {
    expect(changed(null, prev)).toBe(true);
  });

  it("is false when nothing was read", () => {
    expect(changed(prev, {})).toBe(false);
    expect(changed(null, {})).toBe(false);
  });
});

describe("mergeHourly", () => {
  const meta = { region: "us", series: "horde" as const };
  const A = 2447, B = 2318;
  const at = (hour: string, items: Point["items"], src: Point["src"] = "bnet", houses: number | null = 5): Point =>
    ({ ts: `2026-11-20T${hour}:00:00Z`, src, houses, items });
  const r1 = [10, 12, 14, 20, 100, 5], r2 = [11, 13, 15, 21, 90, 4], r3 = [9, 9, 9, 9, 1, 1];

  it("starts a day file from the first point", () => {
    const f = mergeHourly(null, at("15", { [A]: r1, [B]: null }), meta);
    expect(f).toEqual({
      v: 1, region: "us", series: "horde", date: "2026-11-20",
      fields: ["min", "p10", "p25", "median", "qty", "listings"],
      ts: ["2026-11-20T15:00:00Z"], src: ["bnet"], houses: [5],
      items: { [B]: [null], [A]: [r1] },
    });
  });

  it("keeps hours in time order and pads items missing from either side with null", () => {
    let f = mergeHourly(null, at("15", { [A]: r1 }), meta);
    f = mergeHourly(f, at("13", { [B]: r2 }, "bnet", 4), meta);
    expect(f.ts).toEqual(["2026-11-20T13:00:00Z", "2026-11-20T15:00:00Z"]);
    expect(f.houses).toEqual([4, 5]);
    expect(f.items[A]).toEqual([null, r1]);
    expect(f.items[B]).toEqual([r2, null]);
  });

  it("replaces a point for the same hour", () => {
    let f = mergeHourly(null, at("15", { [A]: r1 }), meta);
    f = mergeHourly(f, at("15", { [A]: r2 }, "bnet", 4), meta);
    expect(f.ts).toHaveLength(1);
    expect(f.items[A]).toEqual([r2]);
    expect(f.houses).toEqual([4]);
  });

  it("lets a Blizzard row replace a Forever AH row for the same hour, never the reverse", () => {
    const fah = mergeHourly(null, at("15", { [A]: r3 }, "fah", null), meta);
    const bnet = mergeHourly(fah, at("15", { [A]: r1 }), meta);
    expect(bnet.src).toEqual(["bnet"]);
    expect(bnet.items[A]).toEqual([r1]);
    expect(mergeHourly(bnet, at("15", { [A]: r3 }, "fah", null), meta)).toEqual(bnet);
  });

  it("refuses a point from another day", () => {
    const f = mergeHourly(null, at("15", { [A]: r1 }), meta);
    expect(() => mergeHourly(f, { ...at("15", { [A]: r1 }), ts: "2026-11-21T00:00:00Z" }, meta)).toThrow();
  });
});

describe("rollDay", () => {
  const A = 2447, B = 2318, C = 765;
  // 4 hours read (02 and 04 missing); A present in 3 of them, B in 2, C in none
  const day: HourlyFile = {
    v: 1, region: "us", series: "all", date: "2026-11-20", fields: ["min", "p10", "p25", "median", "qty", "listings"],
    ts: ["2026-11-20T00:00:00Z", "2026-11-20T01:00:00Z", "2026-11-20T03:00:00Z", "2026-11-20T05:00:00Z"],
    src: ["bnet", "bnet", "bnet", "bnet"], houses: [15, 15, 14, 15],
    items: {
      [A]: [[10, 12, 14, 20, 100, 5], [8, 13, 15, 22, 90, 4], null, [11, 16, 17, 25, 80, 3]],
      [B]: [[5, 6, 7, 8, 10, 2], [7, 8, 9, 10, 20, 3], null, null],
      [C]: [null, null, null, null],
    },
  };

  it("takes the lowest min, the medians of the hourly percentiles, and the mean quantity and listings", () => {
    const d = rollDay(day);
    expect(d.ts).toBe("2026-11-20T00:00:00Z");
    expect(d.n).toBe(4);
    expect(d.src).toBe("bnet");
    expect(d.items[A]).toEqual([8, 13, 15, 22, 90, 4]);
  });

  it("averages the middle two for an even count, rounds to whole numbers, and is null with no hours", () => {
    const d = rollDay(day);
    expect(d.items[B]).toEqual([5, 7, 8, 9, 15, 3]); // listings mean 2.5 rounds to 3
    expect(d.items[C]).toBeNull();
  });

  it("keeps p25 null when no hour has it (Forever AH rows), and marks a day of both sources mixed", () => {
    const mixed: HourlyFile = { ...day, src: ["fah", "fah", "bnet", "bnet"],
      items: { [A]: [[10, 12, null, 20, 100, 5], [8, 13, null, 22, 90, 4], null, null] } };
    const d = rollDay(mixed);
    expect(d.src).toBe("mixed");
    // p10 median of 12 and 13 = 12.5 → 13; median of 20 and 22 = 21; qty 95; listings 4.5 → 5
    expect(d.items[A]).toEqual([8, 13, null, 21, 95, 5]);
  });
});

describe("mergeDaily", () => {
  const meta = { region: "us", series: "all" as const };
  const row = (date: string, v: number) => ({ ts: `${date}T00:00:00Z`, src: "bnet" as const, n: 24, items: { 2447: [v, v, v, v, 1, 1] } });

  it("keeps days in order within the month and replaces a rebuilt day", () => {
    let f = mergeDaily(null, row("2026-11-20", 2), meta);
    f = mergeDaily(f, row("2026-11-19", 1), meta);
    f = mergeDaily(f, row("2026-11-20", 3), meta);
    expect(f.month).toBe("2026-11");
    expect(f.ts).toEqual(["2026-11-19T00:00:00Z", "2026-11-20T00:00:00Z"]);
    expect(f.n).toEqual([24, 24]);
    expect(f.items[2447]).toEqual([[1, 1, 1, 1, 1, 1], [3, 3, 3, 3, 1, 1]]);
  });
});

describe("buildLatest", () => {
  it("holds the newest point of every series with the snapshots it came from", () => {
    const p: Point = { ts: "2026-11-20T15:00:00Z", src: "bnet", houses: 5, items: { 2447: [1, 2, 3, 4, 5, 6] } };
    const l = buildLatest("us", { alliance: p, horde: p, blackwater: p, all: { ...p, houses: 15 } }, { 110: "2026-11-20T15:25:08.000Z" }, "2026-11-20T15:41:00.000Z");
    expect(l).toEqual({
      v: 1, region: "us", ts: "2026-11-20T15:00:00Z", generated_at: "2026-11-20T15:41:00.000Z",
      snapshots: { 110: "2026-11-20T15:25:08.000Z" },
      fields: ["min", "p10", "p25", "median", "qty", "listings"],
      series: {
        alliance: { houses: 5, items: { 2447: [1, 2, 3, 4, 5, 6] } },
        horde: { houses: 5, items: { 2447: [1, 2, 3, 4, 5, 6] } },
        blackwater: { houses: 5, items: { 2447: [1, 2, 3, 4, 5, 6] } },
        all: { houses: 15, items: { 2447: [1, 2, 3, 4, 5, 6] } },
      },
    });
  });
});

describe("dayRow", () => {
  const base = { v: 1 as const, region: "us", series: "all" as const, date: "2026-11-13", fields: ["min", "p10", "p25", "median", "qty", "listings"] };
  const fahOnly: HourlyFile = { ...base, ts: ["2026-11-13T17:00:00Z"], src: ["fah"], houses: [null], items: { 2447: [[20, 35, null, 85, 14175, 833]] } };
  const withBnet: HourlyFile = { ...base, ts: ["2026-11-13T17:00:00Z", "2026-11-13T18:00:00Z"], src: ["fah", "bnet"], houses: [null, 15],
    items: { 2447: [[20, 35, null, 85, 14175, 833], [22, 37, 50, 87, 14000, 800]] } };
  const provider = { ts: "2026-11-13T00:00:00Z", src: "fah" as const, n: null, items: { 2447: [18, 39, null, 82, 14308, 842] } };

  it("keeps Forever AH's own daily point for a day with only Forever AH hours", () => {
    expect(dayRow(fahOnly, provider)).toEqual(provider);
  });

  it("rolls up a day that has any Blizzard hours, even if Forever AH gave a daily point", () => {
    // min 20; medians of 35/37 = 36, p25 only 50, 85/87 = 86; qty mean 14087.5 → 14088; listings 816.5 → 817
    expect(dayRow(withBnet, provider)).toEqual({ ts: "2026-11-13T00:00:00Z", src: "mixed", n: 2, items: { 2447: [20, 36, 50, 86, 14088, 817] } });
  });

  it("never rebuilds a Forever-AH-only day from its hours, and is null with nothing to go on", () => {
    expect(dayRow(fahOnly, null)).toBeNull();
    expect(dayRow(null, null)).toBeNull();
    expect(dayRow(null, provider)).toEqual(provider);
  });
});
