// End to end: a Blizzard run from the fixtures, then the real T0 backfill imported into the same folder
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const node = (args: string[]) => execFileSync(process.execPath, ["scripts/fetch-prices.ts", ...args], { encoding: "utf8" });
const text = (out: string, f: string) => readFileSync(path.join(out, f), "utf8");
const read = (out: string, f: string) => JSON.parse(text(out, f));

describe("fetch-prices --mode import of the T0 backfill", () => {
  const out = mkdtempSync(path.join(tmpdir(), "fml-import-"));
  node(["--mode", "run", "--fixtures", "tests/fixtures/auctions", "--out", out]); // Blizzard hour: Nov 19 01:00
  const importArgs = ["--mode", "import", "--from", "data/backfill/forever-ah/us-all", "--out", out];
  node(importArgs);

  it("adds the Forever AH hours to `all`, next to the Blizzard hour", () => {
    const nov19 = read(out, "us/all/hourly/2026-11-19.json");
    expect(nov19.ts).toEqual(["2026-11-19T00:00:00Z", "2026-11-19T01:00:00Z"]);
    expect(nov19.src).toEqual(["fah", "bnet"]);
    expect(nov19.houses).toEqual([null, 2]);
    // Thorium Ore's first T0 hour, from data/backfill/forever-ah/us-all/10620.json
    expect(read(out, "us/all/hourly/2026-11-13.json").items["10620"][0]).toEqual([1232, 1334, null, 1789, 8868, 288]);
  });

  it("keeps Forever AH's daily point for a Forever-AH-only day and rolls up the mixed day", () => {
    const daily = read(out, "us/all/daily/2026-11.json");
    expect(daily.ts[0]).toBe("2026-11-13T00:00:00Z");
    expect(daily.src[0]).toBe("fah");
    expect(daily.n[0]).toBeNull();
    expect(daily.items["10620"][0]).toEqual([1122, 1451, null, 2147, 10080, 382]); // T0's own Nov 13 daily point
    const i19 = daily.ts.indexOf("2026-11-19T00:00:00Z");
    expect(daily.src[i19]).toBe("mixed");
    expect(daily.n[i19]).toBe(2);
  });

  it("leaves the faction series alone", () => {
    expect(read(out, "us/alliance/hourly/2026-11-19.json").ts).toEqual(["2026-11-19T01:00:00Z"]);
  });

  it("changes nothing when imported again", () => {
    const files = ["us/all/hourly/2026-11-13.json", "us/all/hourly/2026-11-19.json", "us/all/daily/2026-11.json", "us/latest.json"];
    const before = files.map((f) => text(out, f));
    node(importArgs);
    expect(files.map((f) => text(out, f))).toEqual(before);
  });
});
