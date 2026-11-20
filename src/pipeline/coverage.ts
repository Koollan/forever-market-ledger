// T11 coverage check, pure: which catalogued item IDs appear in no house's commodities, and how
// many other commodities the scan holds. Only items found in the scan are catalogued (owner, Nov 19, 2026).

export type HouseIds = { id: number; ids: Iterable<number> };
export type HouseCount = { id: number; tracked: number; untracked: number };
export type Coverage = { missing: number[]; untracked: number; perHouse: HouseCount[] };

export function coverage(houses: HouseIds[], catalog: Set<number>): Coverage {
  const seen = new Set<number>();
  const perHouse = houses.map((h) => {
    const ids = new Set(h.ids);
    let tracked = 0;
    for (const id of ids) { seen.add(id); if (catalog.has(id)) tracked++; }
    return { id: h.id, tracked, untracked: ids.size - tracked };
  });
  const missing = [...catalog].filter((id) => !seen.has(id)).sort((a, b) => a - b);
  const untracked = [...seen].filter((id) => !catalog.has(id)).length;
  return { missing, untracked, perHouse };
}
