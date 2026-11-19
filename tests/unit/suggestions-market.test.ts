// Suggestions with API prices (T3 step 10), on the recorded latest.json (newest hour 04:00 UTC, Nov 19, 2026)
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gatherOptions, sellAdvice, todaySuggestions, type SugCtx } from "../../src/engine/suggestions";
import type { Character } from "../../src/engine/types";
import type { Market } from "../../src/engine/market";

const latest = JSON.parse(readFileSync("tests/fixtures/prices/us/latest.json", "utf8"));
const market: Market = { latest, hourly: {} };
const hunter: Character = { id: "h24", name: "Ref Hunter 24", cls: "Hunter", level: 24, faction: "Horde", region: "us", gold: null,
  stretch: 2, skyborne: false, profs: [{ name: "Skinning", skill: 120 }] };
const now = Date.parse("2026-11-19T04:40:00Z");
const kingsblood = { "item~kingsblood": { key: "item~kingsblood", name: "Kingsblood", hist: [{ t: Date.parse("2026-11-18T20:00:00Z"), price: 640 }] } };
const base: SugCtx = { now, items: kingsblood, toggles: {} };
const names = (xs: { name: string }[]) => xs.map((x) => x.name).sort();

describe("sell advice with API prices", () => {
  it("covers the materials you priced plus what you gather that has an API price", () => {
    const sa = sellAdvice(hunter, { ...base, market });
    const gathered = [...new Set(gatherOptions(hunter, base).map((o) => o.name))];
    expect(names(sa)).toEqual(["Kingsblood", ...gathered].sort());
    expect(sa.find((x) => x.name === "Peacebloom")).toBeUndefined(); // has an API price, but a skinner doesn't gather it
  });

  it("bases a gathered material's advice on its API price", () => {
    const leather = sellAdvice(hunter, { ...base, market }).find((x) => x.name === "Light Leather");
    expect(leather?.est.now).toBe(37); // Horde p10 in the recorded file
    expect(leather?.est.source).toBe("api");
    expect(["list", "hold"]).toContain(leather?.action);
  });

  it("uses the newer API hour over your older price, and your price where no API applies (EU)", () => {
    const k = sellAdvice(hunter, { ...base, market }).find((x) => x.name === "Kingsblood");
    // Kingsblood has an API price, so the 04:00 API hour (newer than your 20:00 entry) is used
    expect(k?.est.source).toBe("api");
    const eu = sellAdvice({ ...hunter, region: "eu" }, { ...base, market }).find((x) => x.name === "Kingsblood");
    expect(eu?.est.source).toBeUndefined();
    expect(eu?.est.now).toBe(sellAdvice(hunter, base).find((x) => x.name === "Kingsblood")?.est.now);
  });

  it("is exactly today's advice without API data", () => {
    expect(sellAdvice(hunter, { ...base, market: null })).toEqual(sellAdvice(hunter, base));
    expect(todaySuggestions(hunter, { ...base, market: null })).toEqual(todaySuggestions(hunter, base));
    expect(names(sellAdvice(hunter, base))).toEqual(["Kingsblood"]);
  });
});

describe("gather options with API prices", () => {
  it("value what you gather at its API price", () => {
    const o = gatherOptions(hunter, { ...base, market }).find((x) => x.name === "Light Leather");
    expect(o?.est?.now).toBe(37);
    expect(gatherOptions(hunter, base).find((x) => x.name === "Light Leather")?.est).toBeNull();
  });
});
