// T8 recipe data: every name is a catalogued material or a vendor reagent, numbers are sane, sources are named
import { describe, expect, it } from "vitest";
import { RECIPES, VENDOR } from "../../src/data/recipes";
import { MAT } from "../../src/data/materials";
import { ITEM_ID } from "../../src/data/items";
import { SMELT } from "../../src/data/gathering";

const find = (out: string) => RECIPES.find((r) => r.out === out);

describe("recipes", () => {
  it("only name catalogued materials (which have API prices) and known vendor reagents", () => {
    for (const r of RECIPES) {
      for (const n of [r.out, ...r.ins.map((i) => i[0])]) {
        expect(MAT[n], `${r.out}: ${n}`).toBeDefined();
        expect(ITEM_ID[n], `${r.out}: ${n}`).toBeTypeOf("number");
      }
      for (const [v] of r.vendor ?? []) expect(VENDOR[v], `${r.out}: ${v}`).toBeDefined();
    }
  });

  it("have positive counts, ordered skill colors and a source", () => {
    for (const r of RECIPES) {
      expect(r.n).toBeGreaterThanOrEqual(1);
      expect(r.ins.length).toBeGreaterThan(0);
      for (const [, k] of [...r.ins, ...(r.vendor ?? [])]) expect(k).toBeGreaterThan(0);
      expect(r.skill).toBeGreaterThanOrEqual(1);
      expect(r.skill).toBeLessThanOrEqual(300);
      if (r.colors) {
        const s = [r.skill, ...r.colors];
        expect([...s].sort((a, b) => a - b), r.out).toEqual(s);
      }
      expect(r.src.trim().length, r.out).toBeGreaterThan(0);
    }
  });

  it("have one recipe per output", () => {
    const outs = RECIPES.map((r) => r.out);
    expect(new Set(outs).size).toBe(outs.length);
  });

  it("cover every bar the app already knows how to smelt", () => {
    for (const bar of Object.keys(SMELT)) expect(find(bar)?.prof, bar).toBe("Mining");
  });

  it("match the researched Forever values", () => {
    expect(find("Bronze Bar")).toMatchObject({ n: 2, ins: [["Copper Bar", 1], ["Tin Bar", 1]], skill: 65 });
    expect(find("Dark Iron Bar")).toMatchObject({ ins: [["Dark Iron Ore", 8]], skill: 230, minLevel: 52 });
    expect(find("Steel Bar")).toMatchObject({ ins: [["Iron Bar", 1]], vendor: [["Coal", 1]], skill: 165 });
    expect(find("Medium Leather")).toMatchObject({ ins: [["Light Leather", 4]], skill: 75, prof: "Leatherworking" });
    expect(find("Heavy Leather")).toMatchObject({ ins: [["Medium Leather", 5]], skill: 125 });
    expect(find("Arcanite Bar")).toMatchObject({ prof: "Alchemy", skill: 275, ins: [["Thorium Bar", 1], ["Arcane Crystal", 1]] });
    expect(find("Arcanite Bar")?.cooldown).toBeTruthy();
    expect(find("Elixir of Wisdom")).toMatchObject({ ins: [["Mageroyal", 1], ["Briarthorn", 2]], vendor: [["Empty Vial", 1]], skill: 90, learn: "trainer" });
  });

  it("leave out healing potions (First Aid in Forever, data unconfirmed) and Superior Defense (uncatalogued input)", () => {
    expect(RECIPES.filter((r) => /Healing Potion/.test(r.out))).toEqual([]);
    expect(find("Elixir of Superior Defense")).toBeUndefined();
  });
});

describe("vendor reagents", () => {
  it("have a positive copper price and a source", () => {
    for (const [n, v] of Object.entries(VENDOR)) {
      expect(Number.isInteger(v.price) && v.price > 0, n).toBe(true);
      expect(v.src.length, n).toBeGreaterThan(0);
    }
    expect(VENDOR["Crystal Vial"].price).toBe(500);
    expect(VENDOR.Coal.price).toBe(500);
  });
});
