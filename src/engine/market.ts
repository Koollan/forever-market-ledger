// Market rules for API prices (T3). Pure: takes the loaded price files, your prices, the character and
// `now`; reads no clock, storage or network. Files and rules: planning/t3/design/detailed-design.md.
import { ITEM_ID } from "../data/items";
import { HOUSES } from "../data/consumables";
import { keyOf } from "./util";
import type { Character, Items } from "./types";
import type { HourlyFile, Latest } from "../pipeline/files";
import type { SeriesId } from "../pipeline/houses";

// What the app has loaded from the `prices` branch (either part may be missing)
export type Market = { latest: Latest | null; hourly: Partial<Record<SeriesId, HourlyFile[]>> };
export type Row = (number | null)[]; // [min, p10, p25, median, qty, listings]
export type Active = { price: number; source: "api" | "manual"; at: number; stale: boolean; row?: Row };

const P10 = 1;
const HOUR = 36e5;
export const MANUAL_WINS_MS = 24 * HOUR; // your price beats a newer-than-nothing API price for this long
export const STALE_MS = 3 * HOUR;

// The character's home auction house series; null for EU (API prices are US only for now)
export function homeSeries(c: Character): SeriesId | null {
  if ((c.region ?? "us") !== "us") return null;
  return c.faction === "Alliance" ? "alliance" : "horde";
}

// The newest API row and its hour for one item in one series
export function apiRow(name: string, series: SeriesId, market: Market | null): { row: Row; at: number } | null {
  const id = ITEM_ID[name], entry = market?.latest?.series?.[series];
  const row = id != null ? entry?.items?.[id] : undefined;
  if (!entry || !row || row[P10] == null) return null;
  return { row, at: Date.parse(entry.ts) };
}

// Which price counts now. Your latest price wins while it is newer than the API's hour and under 24 h
// old; otherwise the home series' p10. null = no API value: the estimate from your prices applies as before.
export function activePrice(name: string, x: { items: Items; market: Market | null; character: Character; now: number }): Active | null {
  const series = homeSeries(x.character);
  const api = series ? apiRow(name, series, x.market) : null;
  if (!api) return null;
  const hist = x.items[keyOf(name)]?.hist ?? [];
  const mine = hist.length ? hist.reduce((a, b) => (b.t > a.t ? b : a)) : null;
  if (mine && mine.t > api.at && x.now - mine.t < MANUAL_WINS_MS) return { price: mine.price, source: "manual", at: mine.t, stale: false };
  return { price: api.row[P10] as number, source: "api", at: api.at, stale: x.now - api.at > STALE_MS, row: api.row };
}

// The last `points` hours of p10 for one item in one series, oldest first; null where an hour is missing
export function history(name: string, series: SeriesId, market: Market | null, now: number, points = 24): (number | null)[] {
  const id = ITEM_ID[name], byHour = new Map<number, number | null>();
  for (const f of market?.hourly?.[series] ?? []) {
    const rows = id != null ? f.items?.[id] : undefined;
    if (rows) f.ts.forEach((t, i) => byHour.set(Date.parse(t), rows[i]?.[P10] ?? null));
  }
  const last = Math.floor(now / HOUR) * HOUR;
  return Array.from({ length: points }, (_, k) => byHour.get(last - (points - 1 - k) * HOUR) ?? null);
}

export const HINT_MIN = 0.05; // Blackwater must beat the home house by more than this

// When Blackwater beats the home house: selling compares what you keep after each house's cut
// (src/data/consumables.ts), buying compares listed prices. pct is how much better, as a fraction.
export function blackwaterHint(name: string, mode: "sell" | "buy", x: { market: Market | null; character: Character }): { mode: "sell" | "buy"; price: number; pct: number } | null {
  const series = homeSeries(x.character);
  const home = series ? apiRow(name, series, x.market) : null, bw = apiRow(name, "blackwater", x.market);
  if (!home || !bw) return null;
  const h = home.row[P10] as number, b = bw.row[P10] as number;
  if (mode === "sell") {
    const keepHome = h * (1 - HOUSES[x.character.faction].cut), keepBw = b * (1 - HOUSES.Blackwater.cut);
    const pct = keepBw / keepHome - 1;
    return pct > HINT_MIN ? { mode, price: Math.round(keepBw), pct } : null;
  }
  const pct = 1 - b / h;
  return pct > HINT_MIN ? { mode, price: b, pct } : null;
}

// How fresh the loaded API prices are: the newest hour, stale past 3 h
export function asOf(market: Market | null, now: number): { ts: number; stale: boolean } | null {
  const ts = market?.latest?.ts ? Date.parse(market.latest.ts) : NaN;
  return Number.isNaN(ts) ? null : { ts, stale: now - ts > STALE_MS };
}
