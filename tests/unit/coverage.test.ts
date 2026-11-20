// T11 coverage check: is every catalogued item a commodity in Blizzard's scan? (no network)
import { describe, expect, it } from "vitest";
import { coverage } from "../../src/pipeline/coverage.ts";

describe("coverage", () => {
  it("reports catalog IDs that appear in no house as missing", () => {
    const houses = [{ id: 110, ids: [1, 1, 3] }, { id: 113, ids: [2] }];
    expect(coverage(houses, new Set([1, 2])).missing).toEqual([]);
    expect(coverage(houses, new Set([9, 1, 2, 7])).missing).toEqual([7, 9]);
  });

  it("counts each non-catalog item once across all houses", () => {
    const houses = [{ id: 110, ids: [3, 4, 4, 1] }, { id: 113, ids: [4, 5] }];
    expect(coverage(houses, new Set([1])).untracked).toBe(3); // 3, 4, 5
  });

  it("counts distinct tracked and untracked items per house, with an empty house as zeros", () => {
    // house 112 has no `auctions` key at all (T3 probe), so it reaches here as no IDs
    const houses = [{ id: 110, ids: [1, 1, 3, 4] }, { id: 112, ids: [] }, { id: 113, ids: [2, 4] }];
    const r = coverage(houses, new Set([1, 2]));
    expect(r.perHouse).toEqual([
      { id: 110, tracked: 1, untracked: 2 },
      { id: 112, tracked: 0, untracked: 0 },
      { id: 113, tracked: 1, untracked: 1 },
    ]);
    expect(r.missing).toEqual([]);
    expect(r.untracked).toBe(2);
  });
});
