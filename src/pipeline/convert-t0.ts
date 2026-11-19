// T0 backfill (Forever AH's US "All Auction Houses" view, data/backfill/forever-ah/) → points for the
// `all` series. Forever AH gives min, p10, median, quantity and listings; p25 and the house count are
// unknown (null). Its own daily points are kept as-is (n unknown). See docs/SOURCES.md.
import type { DailyRow, FileRow, Point } from "./files.ts";

type FahPoint = { ts: string; min_unit: number; p10_unit: number; median_unit: number; quantity: number; listings: number };
export type T0File = { item_id: number; hourly: { points: FahPoint[] }; daily: { points: FahPoint[] } };

const row = (p: FahPoint): FileRow => [p.min_unit, p.p10_unit, null, p.median_unit, p.quantity, p.listings];

function collect(files: T0File[], pick: (f: T0File) => FahPoint[]): Map<string, Record<number, FileRow>> {
  const byTs = new Map<string, Record<number, FileRow>>();
  for (const f of files) for (const p of pick(f)) {
    const items = byTs.get(p.ts) ?? {};
    items[f.item_id] = row(p);
    byTs.set(p.ts, items);
  }
  return new Map([...byTs].sort(([a], [b]) => (a < b ? -1 : 1)));
}

export function convertT0(files: T0File[]): { points: Point[]; daily: DailyRow[] } {
  const points = [...collect(files, (f) => f.hourly.points)].map(([ts, items]): Point => ({ ts, src: "fah", houses: null, items }));
  const daily = [...collect(files, (f) => f.daily.points)].map(([ts, items]): DailyRow => ({ ts, src: "fah", n: null, items }));
  return { points, daily };
}
