// T11 coverage check: is every catalogued item a commodity in Blizzard's scan? (no network)
import { describe, expect, it } from "vitest";
import { coverage, formatCoverage, itemIds } from "../../src/pipeline/coverage.ts";

describe("formatCoverage", () => {
  const result = { missing: [9], untracked: 412, perHouse: [{ id: 110, tracked: 130, untracked: 380 }, { id: 112, tracked: 0, untracked: 0 }] };
  const names = new Map([[9, "Chunk of Boar Meat"]]);

  it("names the missing items, counts the untracked ones, and says how many houses were read", () => {
    const lines = formatCoverage(result, names, 14, 15);
    expect(lines).toContain("houses read: 14/15");
    expect(lines).toContain("missing from every house read: Chunk of Boar Meat (9)");
    expect(lines).toContain("untracked: 412 distinct commodity IDs");
    expect(lines).toContain("  house 110: tracked 130, untracked 380");
    expect(lines).toContain("  house 112: tracked 0, untracked 0");
  });

  it("says none when nothing is missing, and shows an ID with no name as-is", () => {
    expect(formatCoverage({ ...result, missing: [] }, names, 15, 15)).toContain("missing from every house read: none");
    expect(formatCoverage({ ...result, missing: [7] }, names, 15, 15)).toContain("missing from every house read: ? (7)");
  });
});

describe("itemIds", () => {
  it("lists each item in a commodities body once", () => {
    const body = { auctions: [{ id: 1, item: { id: 1 }, quantity: 5, unit_price: 10 }, { id: 2, item: { id: 1 }, quantity: 1, unit_price: 12 }, { id: 3, item: { id: 3 }, quantity: 2, unit_price: 9 }] };
    expect([...itemIds(body)].sort()).toEqual([1, 3]);
  });

  it("gives no items for a body without `auctions` (the empty house) or a malformed listing", () => {
    expect([...itemIds({ _links: {} })]).toEqual([]);
    expect([...itemIds({ auctions: [{ id: 9 }, null] })]).toEqual([]);
  });
});

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
