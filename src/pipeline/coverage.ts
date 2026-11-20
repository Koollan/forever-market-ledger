// T11 coverage check, pure: which catalogued item IDs appear in no house's commodities, and how
// many other commodities the scan holds. Only items found in the scan are catalogued (owner, Nov 19, 2026).

export type HouseIds = { id: number; ids: Iterable<number> };
export type HouseCount = { id: number; tracked: number; untracked: number };
export type Coverage = { missing: number[]; untracked: number; perHouse: HouseCount[] };

// The item IDs in one house's /commodities body. A body without `auctions` (the empty house) has none.
export function itemIds(body: unknown): Set<number> {
  const out = new Set<number>();
  const list = (body as { auctions?: unknown })?.auctions;
  if (!Array.isArray(list)) return out;
  for (const a of list as ({ item?: { id?: unknown } } | null)[]) {
    const id = a?.item?.id;
    if (typeof id === "number") out.add(id);
  }
  return out;
}

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

// The probe's report: names, IDs and counts only
export function formatCoverage(r: Coverage, names: Map<number, string>, read: number, total: number): string[] {
  const missing = r.missing.length ? r.missing.map((id) => `${names.get(id) ?? "?"} (${id})`).join(", ") : "none";
  return [
    `houses read: ${read}/${total}`,
    `missing from every house read: ${missing}`,
    `untracked: ${r.untracked} distinct commodity IDs`,
    ...r.perHouse.map((h) => `  house ${h.id}: tracked ${h.tracked}, untracked ${h.untracked}`),
  ];
}
