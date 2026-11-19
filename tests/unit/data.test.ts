import { test, expect } from "vitest";
import { MATS, MAT } from "../../src/data/materials";
import { ZONES, ZONE } from "../../src/data/zones";
import { SKIN_SPOTS } from "../../src/data/skinSpots";
import { GATHER } from "../../src/data/gathering";

test("the catalog has the 136 materials the T0 backfill found on the auction house", () => {
  expect(MATS).toHaveLength(136);
  expect(Object.keys(MAT)).toHaveLength(136); // no duplicate names
});

test("every material has a known category and a tier from 1 to 6", () => {
  const cats = new Set(["Herb", "Leather", "Hide", "Scale", "Ore", "Stone", "Gem", "Cloth", "Bar", "Enchanting",
    "Potion", "Elixir", "Consumable"]);
  for (const m of MATS) {
    expect(cats.has(m.cat), `${m.name}: ${m.cat}`).toBe(true);
    expect(Number.isInteger(m.tier) && m.tier >= 1 && m.tier <= 6, `${m.name}: tier ${m.tier}`).toBe(true);
  }
});

test("every zone has a valid level range and faction", () => {
  for (const z of ZONES) {
    expect(z.min >= 1 && z.max <= 60 && z.min <= z.max, `${z.name}: ${z.min}–${z.max}`).toBe(true);
    expect(["A", "H", "C"]).toContain(z.f);
  }
});

test("every herb and ore a zone lists is a gatherable material", () => {
  const gatherable = new Set([...GATHER.Herbalism, ...GATHER.Mining].map(([n]) => n));
  for (const z of ZONES) for (const n of [...z.herbs, ...z.ores]) expect(gatherable.has(n), `${z.name}: ${n}`).toBe(true);
});

test("every skinning spot is in a known zone, with a sensible beast level range", () => {
  for (const sp of SKIN_SPOTS) {
    expect(ZONE[sp.zone], sp.zone).toBeDefined();
    expect(sp.min >= 1 && sp.max <= 63 && sp.min <= sp.max, `${sp.zone}: ${sp.min}–${sp.max}`).toBe(true);
  }
});
