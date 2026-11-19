// Houses → one series: pool the listings of the series' houses, then take stats of the pool.
// Pooling (not averaging per-house stats) gives the market a buyer across those houses sees.
import { stats, type Listing, type Row } from "./reduce.ts";

export type HouseListings = Map<number, Map<number, Listing[]>>; // house ID → item ID → listings
export type SeriesPoint = { houses: number; items: Record<number, Row | null> };

// `perHouse` holds only the houses read this run; a house read with no listings is an empty map.
export function pool(perHouse: HouseListings, houses: number[], items: number[]): SeriesPoint {
  const read = houses.filter((h) => perHouse.has(h));
  const out: Record<number, Row | null> = {};
  for (const id of items) {
    const all: Listing[] = [];
    for (const h of read) {
      const xs = perHouse.get(h)?.get(id);
      if (xs) all.push(...xs);
    }
    out[id] = stats(all);
  }
  return { houses: read.length, items: out };
}
