// T10: the ruleset table and its houses
import { describe, expect, it } from "vitest";
import { RULESETS, rulesetOf } from "../../src/data/rulesets";
import { SERIES } from "../../src/pipeline/houses";

describe("RULESETS", () => {
  it("lists the four rulesets with Blizzard's ruleset IDs", () => {
    expect(RULESETS.map((r) => [r.key, r.apiId])).toEqual([["normal", 2], ["pvp", 1], ["rp", 3], ["rppvp", 15]]);
  });

  it("gives each ruleset one house per faction, each from that faction's houses, none shared and none empty", () => {
    const used = RULESETS.flatMap((r) => [r.houses.Alliance, r.houses.Horde, r.houses.Blackwater]);
    expect(new Set(used).size).toBe(12);
    for (const r of RULESETS) {
      expect(SERIES.alliance).toContain(r.houses.Alliance);
      expect(SERIES.horde).toContain(r.houses.Horde);
      expect(SERIES.blackwater).toContain(r.houses.Blackwater);
    }
    expect(used.some((h) => [112, 115, 118].includes(h))).toBe(false); // the empty set
  });

  it("finds a ruleset by key, and nothing for anything else", () => {
    expect(rulesetOf("rppvp")?.name).toBe("Roleplay PvP");
    expect(rulesetOf("hardcore")).toBeNull();
    expect(rulesetOf(undefined)).toBeNull();
  });
});
