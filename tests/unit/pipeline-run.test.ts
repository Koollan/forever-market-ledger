// End to end: the fetch script runs the recorded house responses into a folder (no network)
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const run = (out: string, fixtures = "tests/fixtures/auctions") =>
  execFileSync(process.execPath, ["scripts/fetch-prices.ts", "--mode", "run", "--fixtures", fixtures, "--out", out], { encoding: "utf8" });

// A copy of the recorded fixtures with one file changed
function fixturesWith(file: string, change: (saved: { headers: Record<string, string | null>; body: { auctions?: { id: number }[] } }) => void) {
  const dir = mkdtempSync(path.join(tmpdir(), "fml-fixtures-"));
  cpSync("tests/fixtures/auctions", dir, { recursive: true });
  const saved = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
  change(saved);
  writeFileSync(path.join(dir, file), JSON.stringify(saved));
  return dir;
}
const read = (out: string, f: string) => JSON.parse(readFileSync(path.join(out, f), "utf8"));

describe("fetch-prices --mode run on the recorded fixtures", () => {
  const out = mkdtempSync(path.join(tmpdir(), "fml-prices-"));
  const first = run(out);

  it("writes latest, hourly and daily files for the series it read", () => {
    // The fixtures hold houses 110 (busy) and 112 (empty), both Alliance; their newest snapshot is 01:25:08
    const latest = read(out, "us/latest.json");
    expect(latest.ts).toBe("2026-11-19T01:00:00Z");
    expect(latest.snapshots).toEqual({ 110: "2026-11-19T01:25:08.000Z", 112: "2026-11-19T01:24:54.000Z" });
    expect(latest.series.alliance.houses).toBe(2);
    expect(latest.series.horde.houses).toBe(0);
    // Peacebloom has one listing in the fixture: 20 at 7999 copper each
    expect(latest.series.all.items["2447"]).toEqual([7999, 7999, 7999, 7999, 20, 1]);

    const hourly = read(out, "us/all/hourly/2026-11-19.json");
    expect(hourly).toMatchObject({ v: 1, region: "us", series: "all", date: "2026-11-19", fields: ["min", "p10", "p25", "median", "qty", "listings"] });
    expect(hourly.ts).toEqual(["2026-11-19T01:00:00Z"]);
    expect(hourly.src).toEqual(["bnet"]);
    expect(hourly.houses).toEqual([2]);
    expect(hourly.items["2447"]).toEqual([[7999, 7999, 7999, 7999, 20, 1]]);

    const daily = read(out, "us/alliance/daily/2026-11.json");
    expect(daily).toMatchObject({ v: 1, region: "us", series: "alliance", month: "2026-11" });
    expect(daily.ts).toEqual(["2026-11-19T00:00:00Z"]);
    expect(daily.n).toEqual([1]);
    expect(daily.items["2447"]).toEqual([[7999, 7999, 7999, 7999, 20, 1]]);
  });

  it("writes nothing for a series none of whose houses were read", () => {
    expect(existsSync(path.join(out, "us/horde"))).toBe(false);
    expect(existsSync(path.join(out, "us/blackwater"))).toBe(false);
  });

  it("writes nothing on a second run with the same snapshots", () => {
    const files = ["us/latest.json", "us/all/hourly/2026-11-19.json", "us/alliance/daily/2026-11.json"];
    const before = files.map((f) => [readFileSync(path.join(out, f), "utf8"), statSync(path.join(out, f)).mtimeMs]);
    const second = run(out);
    expect(second).toContain("no new snapshot");
    expect(files.map((f) => [readFileSync(path.join(out, f), "utf8"), statSync(path.join(out, f)).mtimeMs])).toEqual(before);
    expect(first).not.toContain("no new snapshot");
  });
});

describe("fetch-prices --mode run when Blizzard's responses change shape", () => {
  it("still records when a house has no Last-Modified, using the run's hour", () => {
    const out = mkdtempSync(path.join(tmpdir(), "fml-prices-"));
    const stdout = run(out, fixturesWith("house-110-commodities.json", (f) => { f.headers["last-modified"] = null; }));
    expect(stdout).toContain("no Last-Modified: 110");
    expect(read(out, "us/latest.json").series.all.items["2447"]).toEqual([7999, 7999, 7999, 7999, 20, 1]);
  });

  it("writes nothing when a house serves an older snapshot than the one stored", () => {
    const out = mkdtempSync(path.join(tmpdir(), "fml-prices-"));
    run(out);
    const before = readFileSync(path.join(out, "us/latest.json"), "utf8");
    const stdout = run(out, fixturesWith("house-110-commodities.json", (f) => { f.headers["last-modified"] = "Thu, 19 Nov 2026 00:25:08 GMT"; }));
    expect(stdout).toContain("no new snapshot");
    expect(readFileSync(path.join(out, "us/latest.json"), "utf8")).toBe(before);
  });

  it("warns when Blizzard's house index differs from the house list", () => {
    const out = mkdtempSync(path.join(tmpdir(), "fml-prices-"));
    const stdout = run(out, fixturesWith("index.json", (f) => { f.body.auctions = f.body.auctions!.filter((h) => h.id !== 112).concat({ id: 126 }); }));
    expect(stdout).toContain("::warning::");
    expect(stdout).toMatch(/new houses: 126.*not listed: 112/);
  });
});
