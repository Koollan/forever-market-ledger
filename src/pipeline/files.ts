// The files on the `prices` branch (see planning/t3/design/detailed-design.md, section 5). Pure: each
// function takes a file (or null) and returns a new one. Columnar: `ts`, `src`, `houses`/`n` and every
// item's rows line up by index, sorted by `ts`, so T4 can slice by weekday and hour.
import { FIELDS } from "./reduce.ts";
import type { SeriesId } from "./houses.ts";

export type Source = "bnet" | "fah"; // Blizzard Game Data API, or Forever AH (T0 backfill)
// [min, p10, p25, median, qty, listings]; p25 is null in Forever AH rows
export type FileRow = (number | null)[];
export type Meta = { region: string; series: SeriesId };

export type Point = { ts: string; src: Source; houses: number | null; items: Record<number, FileRow | null> };

type Header = { v: 1; region: string; series: SeriesId; fields: string[] };
export type HourlyFile = Header & {
  date: string; // UTC day, yyyy-mm-dd
  ts: string[]; src: Source[]; houses: (number | null)[];
  items: Record<number, (FileRow | null)[]>;
};

const header = (meta: Meta): Header => ({ v: 1, region: meta.region, series: meta.series, fields: [...FIELDS] });

// Insert a point by hour, or replace that hour. A Forever AH point never replaces a Blizzard one.
export function mergeHourly(file: HourlyFile | null, point: Point, meta: Meta): HourlyFile {
  const date = point.ts.slice(0, 10);
  if (file && file.date !== date) throw new Error(`point ${point.ts} is not on ${file.date}`);
  const f: HourlyFile = file
    ? { ...file, ts: [...file.ts], src: [...file.src], houses: [...file.houses], items: Object.fromEntries(Object.entries(file.items).map(([k, v]) => [k, [...v]])) }
    : { ...header(meta), date, ts: [], src: [], houses: [], items: {} };

  let i = f.ts.indexOf(point.ts);
  if (i >= 0) {
    if (f.src[i] === "bnet" && point.src === "fah") return file as HourlyFile;
  } else {
    i = f.ts.findIndex((t) => t > point.ts);
    if (i < 0) i = f.ts.length;
    f.ts.splice(i, 0, point.ts);
    f.src.splice(i, 0, point.src);
    f.houses.splice(i, 0, point.houses);
    for (const rows of Object.values(f.items)) rows.splice(i, 0, null);
  }
  f.src[i] = point.src;
  f.houses[i] = point.houses;
  for (const rows of Object.values(f.items)) rows[i] = null;
  for (const [id, row] of Object.entries(point.items)) {
    const key = Number(id);
    if (!f.items[key]) f.items[key] = f.ts.map(() => null);
    f.items[key][i] = row;
  }
  return f;
}

export type DailySource = Source | "mixed";
export type DailyRow = { ts: string; src: DailySource; n: number | null; items: Record<number, FileRow | null> };
export type DailyFile = Header & {
  month: string; // UTC month, yyyy-mm
  ts: string[]; src: DailySource[]; n: (number | null)[]; // n null = hours unknown (Forever AH daily point)
  items: Record<number, (FileRow | null)[]>;
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const known = (rows: FileRow[], i: number) => rows.map((r) => r[i]).filter((v): v is number => v != null);
const roundOrNull = (xs: number[], f: (xs: number[]) => number) => (xs.length ? Math.round(f(xs)) : null);

// One UTC day of hourly rows → one daily row per item: lowest min; medians of the hourly p10, p25
// and median; rounded means of qty and listings. n = hours read that day.
export function rollDay(file: HourlyFile): DailyRow {
  const items: Record<number, FileRow | null> = {};
  for (const [id, rows] of Object.entries(file.items)) {
    const present = rows.filter((r): r is FileRow => r != null);
    items[Number(id)] = present.length
      ? [Math.min(...known(present, 0)), roundOrNull(known(present, 1), median), roundOrNull(known(present, 2), median),
         roundOrNull(known(present, 3), median), roundOrNull(known(present, 4), mean), roundOrNull(known(present, 5), mean)]
      : null;
  }
  const srcs = new Set(file.src);
  const src: DailySource = srcs.size === 1 ? file.src[0] : "mixed";
  return { ts: `${file.date}T00:00:00Z`, src, n: file.ts.length, items };
}

// Insert a day into its month file, or replace that day.
export function mergeDaily(file: DailyFile | null, row: DailyRow, meta: Meta): DailyFile {
  const month = row.ts.slice(0, 7);
  if (file && file.month !== month) throw new Error(`day ${row.ts} is not in ${file.month}`);
  const f: DailyFile = file
    ? { ...file, ts: [...file.ts], src: [...file.src], n: [...file.n], items: Object.fromEntries(Object.entries(file.items).map(([k, v]) => [k, [...v]])) }
    : { ...header(meta), month, ts: [], src: [], n: [], items: {} };
  let i = f.ts.indexOf(row.ts);
  if (i < 0) {
    i = f.ts.findIndex((t) => t > row.ts);
    if (i < 0) i = f.ts.length;
    f.ts.splice(i, 0, row.ts);
    f.src.splice(i, 0, row.src);
    f.n.splice(i, 0, row.n);
    for (const rows of Object.values(f.items)) rows.splice(i, 0, null);
  }
  f.src[i] = row.src;
  f.n[i] = row.n;
  for (const rows of Object.values(f.items)) rows[i] = null;
  for (const [id, r] of Object.entries(row.items)) {
    const key = Number(id);
    if (!f.items[key]) f.items[key] = f.ts.map(() => null);
    f.items[key][i] = r;
  }
  return f;
}

export type Latest = {
  v: 1; region: string; ts: string; generated_at: string; snapshots: Record<number, string>; fields: string[];
  series: Record<SeriesId, { houses: number | null; items: Record<number, FileRow | null> }>;
};

export function buildLatest(region: string, points: Record<SeriesId, Point>, snapshots: Record<number, string>, generatedAt: string): Latest {
  const series = Object.fromEntries(Object.entries(points).map(([s, p]) => [s, { houses: p.houses, items: p.items }])) as Latest["series"];
  return { v: 1, region, ts: points.all.ts, generated_at: generatedAt, snapshots, fields: [...FIELDS], series };
}

// Stable text for the `prices` branch: one top-level key per line and one item per line, so an hourly
// commit's diff shows which items changed. Ends with a newline.
export function formatFile(file: object): string {
  const lines = Object.entries(file).map(([k, v]) => {
    // Maps (items, snapshots, latest's series) get one entry per line; `series` is a plain string in day files
    if ((k === "items" || k === "series" || k === "snapshots") && v && typeof v === "object" && !Array.isArray(v)) {
      const inner = Object.entries(v as object).map(([ik, iv]) => `    ${JSON.stringify(ik)}: ${k === "series" ? formatFile(iv as object).trimEnd().replace(/\n/g, "\n    ") : JSON.stringify(iv)}`);
      return inner.length ? `  ${JSON.stringify(k)}: {\n${inner.join(",\n")}\n  }` : `  ${JSON.stringify(k)}: {}`;
    }
    return `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  });
  return `{\n${lines.join(",\n")}\n}\n`;
}
