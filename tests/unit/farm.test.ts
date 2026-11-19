import { test, expect, describe } from "vitest";
import { reachZones, whereGather } from "../../src/engine/farm";
import { skinReq, skinPlan } from "../../src/engine/skinning";
import { skillColor, canGather, rankBlock, cutFor, houseOf, perHour } from "../../src/engine/character";
import { whenTxt } from "../../src/engine/util";
import type { Character } from "../../src/engine/types";

const hunter24: Character = { id: "h", name: "H", cls: "Hunter", level: 24, faction: "Horde", stretch: 2,
  profs: [{ name: "Skinning", skill: 120 }] };
const rogue15: Character = { id: "r", name: "R", cls: "Rogue", level: 15, faction: "Alliance", stretch: 2,
  profs: [{ name: "Herbalism", skill: 90 }, { name: "Skinning", skill: 80 }] };
const names = (c: Character) => reachZones(c).map((z) => z.name);
const spot = (min: number, max: number) => ({ zone: "The Barrens", min, max, beasts: "Thunderheads", spots: ["Camp Taurajo"], leather: "Medium" });

test("skinning skill needed: 1 up to beast level 10, then 10 per level to 20, then 5 × level", () => {
  expect([1, 10, 11, 20, 21, 60].map(skinReq)).toEqual([1, 1, 10, 100, 105, 300]);
});

test("skill colors: orange under req+25, yellow under +50, green under +100, then grey; locked below req", () => {
  expect([99, 100, 124, 125, 149, 150, 199, 200].map((s) => skillColor(s, 100)[0]))
    .toEqual(["locked", "orange", "orange", "yellow", "yellow", "green", "green", "gray"]);
});

describe("zone reach", () => {
  test("own-faction and contested zones up to level + reach", () => {
    const z = names(hunter24);
    expect(z).toContain("The Barrens"); // Horde 10–25
    expect(z).toContain("Stonetalon Mountains"); // contested 15–27
    expect(z).not.toContain("Elwynn Forest"); // Alliance
    expect(z).not.toContain("Feralas"); // starts at 40
  });
  test("reach adds levels: a level 13 reaches Stonetalon (15+) only with +2", () => {
    expect(names({ ...hunter24, level: 13, stretch: 0 })).not.toContain("Stonetalon Mountains");
    expect(names({ ...hunter24, level: 13, stretch: 2 })).toContain("Stonetalon Mountains");
  });
  test("Zephras Isle needs a Skyborne character", () => {
    expect(names(hunter24)).not.toContain("Zephras Isle");
    expect(names({ ...hunter24, skyborne: true })).toContain("Zephras Isle");
  });
});

test("where to gather lists only reachable zones", () => {
  const w = whereGather("Peacebloom", "Herbalism", hunter24);
  expect(w.zones).toContain("The Barrens");
  expect(w.zones).not.toContain("Elwynn Forest");
  expect(w.unlock).toBeNull();
});

describe("skinning a spot", () => {
  test("a level-24 hunter with 120 skill skins level-23 beasts at orange (+5 over need)", () => {
    expect(skinPlan(hunter24, spot(20, 23))).toMatchObject({ lvl: 23, lo: 20, hi: 23, col: ["orange", "c-orange"], score: 323 });
  });
  test("lower beasts are yellow when the skill is 25–49 over their need", () => {
    expect(skinPlan(hunter24, spot(15, 18))).toMatchObject({ lvl: 18, col: ["yellow", "c-yellow"], score: 218 });
  });
  test("beasts more than 3 levels above the character are out of reach", () => {
    expect(skinPlan(rogue15, spot(20, 23))).toBeNull();
  });
  test("a spot whose beasts all need more skill is locked at the lowest beast's need", () => {
    const low = { ...hunter24, profs: [{ name: "Skinning", skill: 50 }] };
    expect(skinPlan(low, spot(20, 23))).toMatchObject({ lockedAt: 100, col: ["locked", "c-gray"] });
  });
});

test("can gather: needs the profession, the skill and a reachable zone", () => {
  expect(canGather(rogue15, "Briarthorn")).toMatchObject({ prof: "Herbalism" }); // req 70
  expect(canGather(rogue15, "Kingsblood")).toBeNull(); // req 125 > 90
  expect(canGather(rogue15, "Copper Bar")).toBeNull(); // smelting needs Mining
});

test("training: near a cap below the next rank's level is a blocker", () => {
  const p = { name: "Herbalism", skill: 145 };
  expect(rankBlock({ ...rogue15, level: 8 }, p)).toMatchObject({ blocked: true });
  expect(rankBlock({ ...rogue15, level: 20 }, p)?.blocked).toBeUndefined();
  expect(rankBlock(rogue15, { name: "Herbalism", skill: 100 })).toBeNull();
});

test("auction cut: 5% at a faction house, 15% at Blackwater", () => {
  expect(houseOf(rogue15)).toBe("Alliance");
  expect(cutFor("Alliance")).toBe(0.05);
  expect(cutFor("Blackwater")).toBe(0.15);
});

test("gold per hour: 25 skins × 1.5 an hour at 120c each, after the 5% cut, is 4275c", () => {
  expect(perHour({ prof: "Skinning", est: { now: 120 } }, hunter24)).toBe(4275);
  expect(perHour({ prof: "Skinning", est: null }, hunter24)).toBeNull();
});

test("a time within 90 minutes reads as now", () => {
  const now = Date.parse("2026-11-18T19:00:00Z");
  expect(whenTxt(now + 60 * 60e3, now)).toBe("now");
  expect(whenTxt(now + 3 * 60 * 60e3, now)).not.toBe("now");
});
