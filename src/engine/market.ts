// Market rules for API prices (T3). Pure: takes the loaded price files, your prices, the character and
// `now`; reads no clock, storage or network. Files and rules: planning/t3/design/detailed-design.md.
import { ITEM_ID } from "../data/items";
import { HOUSES } from "../data/consumables";
import { keyOf } from "./util";
import type { Character, Items } from "./types";
import type { HourlyFile, Latest } from "../pipeline/files";
import { SERIES, houseSeries, housesOf, type SeriesId, type StoredSeries } from "../pipeline/houses";
import { rulesetOf } from "../data/rulesets";

// What the app has loaded from the `prices` branch (either part may be missing)
export type Market = { latest: Latest | null; hourly: Partial<Record<StoredSeries, HourlyFile[]>> };
export type Row = (number | null)[]; // [min, p10, p25, median, qty, listings]
export type Active = { price: number; source: "api" | "manual"; at: number; stale: boolean; row?: Row };

const P10 = 1;
const HOUR = 36e5;
export const MANUAL_WINS_MS = 24 * HOUR; // your price beats a newer-than-nothing API price for this long
export const STALE_MS = 3 * HOUR;
export const API_MAX_AGE_MS = 24 * HOUR; // older API prices no longer drive prices or advice

// The character's home auction house series; null for EU (API prices are US only for now). With a
// ruleset set (T10), its own faction house; without one, the faction series that pools every ruleset.
export function homeSeries(c: Character): StoredSeries | null {
  if ((c.region ?? "us") !== "us") return null;
  const r = rulesetOf(c.ruleset);
  if (r) return houseSeries(r.houses[c.faction]);
  return c.faction === "Alliance" ? "alliance" : "horde";
}

// The Blackwater house the character can reach: its ruleset's, else the pooled Blackwater series
export function blackwaterSeries(c: Character): StoredSeries {
  const r = rulesetOf(c.ruleset);
  return r ? houseSeries(r.houses.Blackwater) : "blackwater";
}

// A house series latest.json doesn't carry (files from before the ruleset picker), or a house never read,
// falls back to the faction series that pools that house
function inLatest(series: StoredSeries, latest: Latest): StoredSeries {
  if (!series.startsWith("house-") || latest.series?.[series]?.houses) return series;
  const house = housesOf(series)[0];
  return (Object.keys(SERIES) as SeriesId[]).find((s) => s !== "all" && SERIES[s].includes(house)) ?? series;
}

// The newest API row for one item in one series, with the time its data was taken: the series' newest
// house snapshot within its hour (else the hour itself). Values that aren't numbers become null (the
// files come from the network); a row without a p10 counts as no API price.
export function apiRow(name: string, wanted: StoredSeries, market: Market | null): { row: Row; at: number } | null {
  const latest = market?.latest, series = latest ? inLatest(wanted, latest) : wanted;
  const entry = latest?.series?.[series], id = ITEM_ID[name];
  const raw: unknown = id != null ? entry?.items?.[id] : undefined;
  if (!latest || !entry || !Array.isArray(raw)) return null;
  const row: Row = raw.map((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));
  const hour = Date.parse(entry.ts ?? latest.ts);
  if (row[P10] == null || Number.isNaN(hour)) return null;
  const snaps = housesOf(series).map((h) => Date.parse(latest.snapshots?.[h] ?? "")).filter((t) => t >= hour && t < hour + HOUR);
  return { row, at: snaps.length ? Math.max(...snaps) : hour };
}

// Which price counts now. Your latest price wins while it is newer than the API's hour and under 24 h
// old; otherwise the home series' p10. null = no API value: the estimate from your prices applies as before.
export function activePrice(name: string, x: { items: Items; market: Market | null; character: Character; now: number }): Active | null {
  const series = homeSeries(x.character);
  const api = series ? apiRow(name, series, x.market) : null;
  if (!api || x.now - api.at > API_MAX_AGE_MS) return null; // a day-old API price falls back to yours
  const hist = x.items[keyOf(name)]?.hist ?? [];
  const mine = hist.length ? hist.reduce((a, b) => (b.t > a.t ? b : a)) : null;
  if (mine && mine.t > api.at && x.now - mine.t < MANUAL_WINS_MS) return { price: mine.price, source: "manual", at: mine.t, stale: false };
  return { price: api.row[P10] as number, source: "api", at: api.at, stale: x.now - api.at > STALE_MS, row: api.row };
}

// The last `points` hours of p10 for one item in one series, oldest first; null where an hour is missing
export function history(name: string, series: StoredSeries, market: Market | null, now: number, points = 24): (number | null)[] {
  const id = ITEM_ID[name], byHour = new Map<number, number | null>();
  for (const f of market?.hourly?.[series] ?? []) {
    const rows = id != null ? f.items?.[id] : undefined;
    if (rows) f.ts.forEach((t, i) => { const v: unknown = rows[i]?.[P10]; byHour.set(Date.parse(t), typeof v === "number" && Number.isFinite(v) ? v : null); });
  }
  const last = Math.floor(now / HOUR) * HOUR;
  return Array.from({ length: points }, (_, k) => byHour.get(last - (points - 1 - k) * HOUR) ?? null);
}

export const HINT_MIN = 0.05; // Blackwater must beat the home house by more than this

// When Blackwater beats the home house: selling compares what you keep after each house's cut
// (src/data/consumables.ts), buying compares listed prices. pct is how much better, as a fraction.
export function blackwaterHint(name: string, mode: "sell" | "buy", x: { market: Market | null; character: Character }): { mode: "sell" | "buy"; price: number; pct: number } | null {
  const series = homeSeries(x.character);
  const home = series ? apiRow(name, series, x.market) : null, bw = apiRow(name, blackwaterSeries(x.character), x.market);
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

// How fresh the loaded API prices are: the series' own hour (a series whose houses failed keeps an older
// one), else the file's newest hour; stale past 3 h
export function asOf(market: Market | null, now: number, series?: StoredSeries | null): { ts: number; stale: boolean } | null {
  const l = market?.latest, own = series && l ? l.series?.[inLatest(series, l)]?.ts : undefined;
  const ts = Date.parse(own ?? l?.ts ?? "");
  return Number.isNaN(ts) ? null : { ts, stale: now - ts > STALE_MS };
}
