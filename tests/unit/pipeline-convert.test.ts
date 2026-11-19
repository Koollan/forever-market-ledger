// T0 conversion: Forever AH backfill files → Forever AH points and daily rows (expected values read from the files)
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { convertT0 } from "../../src/pipeline/convert-t0.ts";

const t0 = (id: number) => JSON.parse(readFileSync(`data/backfill/forever-ah/us-all/${id}.json`, "utf8"));

describe("convertT0", () => {
  const { points, daily } = convertT0([t0(10620), t0(2447)]);

  it("makes one Forever AH point per hour, with p25 and the house count unknown", () => {
    expect(points).toHaveLength(126); // Nov 13 17:00 to Nov 19 00:00 UTC, with some hours missing
    expect(points[0]).toEqual({
      ts: "2026-11-13T17:00:00Z", src: "fah", houses: null,
      items: { 2447: [20, 35, null, 85, 14175, 833], 10620: [1232, 1334, null, 1789, 8868, 288] },
    });
    expect(points.at(-1)?.ts).toBe("2026-11-19T00:00:00Z");
    expect(points.filter((p) => p.ts.startsWith("2026-11-13"))).toHaveLength(6);
  });

  it("keeps Forever AH's own daily points, with the hour count unknown", () => {
    expect(daily.map((d) => d.ts.slice(0, 10))).toEqual(["2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]);
    expect(daily[0]).toEqual({ ts: "2026-11-13T00:00:00Z", src: "fah", n: null,
      items: { 2447: [18, 39, null, 82, 14308, 842], 10620: [1122, 1451, null, 2147, 10080, 382] } });
  });
});
