// The item ID map the price pipeline uses to pick catalogued materials out of the auction data
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { MATS } from "../../src/data/materials";

const raw = JSON.parse(readFileSync("data/items.json", "utf8")) as Record<string, unknown>;
const { _source, ...ids } = raw;

describe("data/items.json", () => {
  it("names its source", () => {
    expect(typeof _source).toBe("string");
  });

  it("has a positive whole-number item ID for every catalogued material", () => {
    const catalog = MATS.map((m) => m.name).sort();
    expect(Object.keys(ids).sort()).toEqual(catalog);
    for (const [name, id] of Object.entries(ids)) {
      expect(Number.isInteger(id) && (id as number) > 0, `${name}: ${String(id)}`).toBe(true);
    }
  });

  it("never maps two materials to the same item", () => {
    const values = Object.values(ids);
    expect(new Set(values).size).toBe(values.length);
  });
});
