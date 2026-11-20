import { test, expect, describe } from "vitest";
import { ctxAt, shiftAt, windows, frontLevel } from "../../src/engine/conditions";
import { estimate } from "../../src/engine/estimate";
import { MAT } from "../../src/data/materials";

// All times are New York (tests pin TZ=America/New_York). Forever launched 2026-11-04 00:00 UTC.
const ny = (local: string) => {
  // EST is UTC-5 in November
  return Date.parse(local + "-05:00");
};
const herb1 = { name: "Peacebloom", cat: "Herb", tier: 1 };
const bar3 = { name: "Iron Bar", cat: "Bar", tier: 3 };
const potion = { name: "Mana Potion", cat: "Potion", tier: 3 };
const endgame = { name: "Thorium Bar", cat: "Bar", tier: 6 };
const ids = (r: { why: { id: string; p: number }[] }) => Object.fromEntries(r.why.map((w) => [w.id, w.p]));

describe("leveling front", () => {
  test("starts at level 8 on launch and is about level 41 after 25 days", () => {
    expect(frontLevel(Date.parse("2026-11-04T00:00:00Z"))).toBe(8);
    expect(frontLevel(Date.parse("2026-11-29T00:00:00Z"))).toBeCloseTo(40.87, 2);
  });
});

describe("weekend runs from Friday 17:00 through Sunday", () => {
  test("Friday 16:59 is not the weekend, 17:00 is", () => {
    expect(ctxAt(ny("2026-11-20T16:59:00"), {}).weekend).toBe(false);
    expect(ctxAt(ny("2026-11-20T17:00:00"), {}).weekend).toBe(true);
  });
  test("on the weekend raw materials are 7% down and crafted ones are untouched by it", () => {
    const sat = ny("2026-11-21T12:00:00");
    expect(ids(shiftAt(herb1, sat, {})).weekend).toBe(-7);
    expect(ids(shiftAt(bar3, sat, {})).weekend).toBeUndefined();
    // T11: meat, fish and eggs are raw; elementals and gems are not
    for (const name of ["Chunk of Boar Meat", "Raw Brilliant Smallfish", "Small Egg"]) expect(ids(shiftAt(MAT[name], sat, {})).weekend, name).toBe(-7);
    for (const name of ["Elemental Fire", "Jade"]) expect(ids(shiftAt(MAT[name], sat, {})).weekend, name).toBeUndefined();
  });
});

test("Tuesday to Thursday raw materials are 4% up", () => {
  expect(ids(shiftAt(herb1, ny("2026-11-17T12:00:00"), {})).midweek).toBe(4);
  expect(ids(shiftAt(herb1, ny("2026-11-19T12:00:00"), {})).midweek).toBe(4);
  expect(ids(shiftAt(herb1, ny("2026-11-23T12:00:00"), {})).midweek).toBeUndefined(); // Monday
});

describe("raid reset prep: Monday 17:00 to Tuesday, from day 14", () => {
  test("potions are 10% up on Monday evening in week three", () => {
    expect(ids(shiftAt(potion, ny("2026-11-23T18:00:00"), {})).raid).toBe(10);
  });
  test("not before Monday 17:00, and not in the first two weeks", () => {
    expect(ids(shiftAt(potion, ny("2026-11-23T16:00:00"), {})).raid).toBeUndefined();
    expect(ids(shiftAt(potion, ny("2026-11-16T18:00:00"), {})).raid).toBeUndefined(); // day 12
  });
});

test("endgame demand adds 10% to level-60 materials from day 21", () => {
  expect(ids(shiftAt(endgame, ny("2026-11-24T18:00:00"), {})).endgame).toBeUndefined(); // day 20
  expect(ids(shiftAt(endgame, ny("2026-11-25T12:00:00"), {})).endgame).toBe(10); // day 21
});

test("greenhouse herbs take 3% off herbs from day 30", () => {
  expect(ids(shiftAt(herb1, ny("2026-12-03T12:00:00"), {})).greenhouse).toBeUndefined(); // day 29
  expect(ids(shiftAt(herb1, ny("2026-12-04T12:00:00"), {})).greenhouse).toBe(-3); // day 30
});

test("prime time adds 3% when selling, quiet hours take 3% off when buying", () => {
  const evening = ny("2026-11-18T19:00:00"), early = ny("2026-11-18T05:00:00");
  expect(ids(shiftAt(bar3, evening, {}, "sell")).prime).toBe(3);
  expect(ids(shiftAt(bar3, evening, {}, "buy")).prime).toBeUndefined();
  expect(ids(shiftAt(bar3, early, {}, "buy")).quiet).toBe(-3);
  expect(ids(shiftAt(bar3, early, {}, "sell")).quiet).toBeUndefined();
});

test("shifts multiply: an outleveled herb on Wednesday afternoon is 0.88 × 1.04", () => {
  // day 14: front ≈ level 31 (tier 4), so a tier-1 herb is ≥2 tiers behind (−12%), plus midweek (+4%)
  expect(shiftAt(herb1, ny("2026-11-18T14:00:00"), {}).mult).toBeCloseTo(0.9152, 4);
});

test("an estimate removes the conditions a price was entered under", () => {
  // 82c entered on Saturday (−12% front, −7% weekend = ×0.8184) is a base of ~100c,
  // which is ~92c under Wednesday's conditions (×0.9152)
  const items = { "item~peacebloom": { key: "item~peacebloom", name: "Peacebloom", hist: [{ t: ny("2026-11-21T12:00:00"), price: 82 }] } };
  const e = estimate("Peacebloom", items, {}, ny("2026-11-18T14:00:00"));
  expect(e?.now).toBe(92);
  expect(e?.n).toBe(1);
  expect(estimate("Silverleaf", items, {}, ny("2026-11-18T14:00:00"))).toBeNull();
});

test("the best selling window for a raw herb seen from Saturday is a weekday evening", () => {
  const w = windows(herb1, {}, "sell", 168, ny("2026-11-21T12:00:00"));
  expect(w.now).toBeCloseTo(0.8184, 4);
  const best = new Date(w.best.t);
  expect([2, 3, 4]).toContain(best.getDay()); // Tuesday to Thursday
  expect(best.getHours()).toBeGreaterThanOrEqual(18);
  expect(best.getHours()).toBeLessThan(23);
  expect(w.best.s / w.now - 1).toBeGreaterThan(0.05); // worth holding
});
