// T11: the curated goods outside the gathering tables (Cooking, Fishing, elementals, gems, trade goods)
import { describe, expect, it } from "vitest";
import { GOODS } from "../../src/data/goods";
import { MAT, MATS } from "../../src/data/materials";

describe("GOODS", () => {
  it("are in the catalog with their category, tier and professions", () => {
    expect(MAT["Chunk of Boar Meat"]).toMatchObject({ cat: "Meat", tier: 1, profs: ["Cooking"] });
    expect(MAT["Raw Nightfin Snapper"]).toMatchObject({ cat: "Fish", tier: 6, profs: ["Cooking", "Fishing"] });
    expect(MAT["Elemental Fire"]).toMatchObject({ cat: "Elemental", tier: 4 });
    expect(MAT["Elemental Fire"].profs).toBeUndefined();
  });

  it("don't reuse a name from the gathering tables or each other", () => {
    const names = GOODS.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
    const others = MATS.filter((m) => !names.includes(m.name)).map((m) => m.name);
    for (const n of names) expect(others, n).not.toContain(n);
  });

  it("each have a tier from 1 to 6, and professions only on Meat, Egg and Fish", () => {
    for (const g of GOODS) {
      expect(Number.isInteger(g.tier) && g.tier >= 1 && g.tier <= 6, `${g.name}: tier ${g.tier}`).toBe(true);
      const want = g.cat === "Fish" ? ["Cooking", "Fishing"] : g.cat === "Meat" || g.cat === "Egg" ? ["Cooking"] : undefined;
      expect(g.profs, g.name).toEqual(want);
    }
  });
});
