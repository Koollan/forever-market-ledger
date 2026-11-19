// API prices for the app (T3): fetch the newest files from the `prices` branch, keep the last good copy on
// this device, and say how fresh they are. No DOM here; fetch and storage are passed in so tests need
// neither. Files: planning/t3/design/detailed-design.md, section 5.
import type { Market } from "../engine/market";
import type { HourlyFile, Latest } from "../pipeline/files";
import type { SeriesId } from "../pipeline/houses";

export const PRICES_URL = "https://raw.githubusercontent.com/Koollan/forever-market-ledger/prices/";
export const PRICES_KEY = "fml-prices"; // separate from fml-cache, so Backup doesn't carry it
export const REFRESH_MS = 30 * 6e4; // refetch when the tab comes back and the copy is older than this
const TIMEOUT_MS = 10_000;

type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void };
type Fetch = (url: string, init?: RequestInit) => Promise<Response>;
export type PriceCache = { v: 1; fetchedAt: number; region: string; series: SeriesId; latest: Latest; hourly: HourlyFile[] };

export function readCache(storage: Storage): PriceCache | null {
  try {
    const c = JSON.parse(storage.getItem(PRICES_KEY) || "null");
    return c && c.v === 1 && c.latest ? (c as PriceCache) : null;
  } catch { return null; }
}

export function writeCache(storage: Storage, cache: PriceCache): void {
  try { storage.setItem(PRICES_KEY, JSON.stringify(cache)); } catch { /* full or blocked: keep going without a cache */ }
}

const fromCache = (c: PriceCache | null, series: SeriesId): Market | null =>
  c ? { latest: c.latest, hourly: c.series === series ? { [series]: c.hourly } : {} } : null;

const isLatest = (x: unknown): x is Latest => !!x && (x as Latest).v === 1 && typeof (x as Latest).ts === "string" && !!(x as Latest).series;
const isHourly = (x: unknown): x is HourlyFile => !!x && (x as HourlyFile).v === 1 && typeof (x as HourlyFile).date === "string" && Array.isArray((x as HourlyFile).ts);

async function getJson(fetch: Fetch, url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? await res.json() : null;
  } catch { return null; }
}

// latest.json plus today's and yesterday's hourly file (UTC) for the home series. Returns the fresh copy
// and caches it, or the cached copy if latest.json can't be had, or null. Never throws.
export async function loadPrices(x: { fetch: Fetch; storage: Storage; now: number; region: string; series: SeriesId | null; base?: string }): Promise<Market | null> {
  if (x.region !== "us" || !x.series) return null; // API prices are US only for now
  const base = x.base ?? PRICES_URL, series = x.series;
  const day = (offset: number) => new Date(x.now - offset * 864e5).toISOString().slice(0, 10);
  const [latest, ...days] = await Promise.all([
    getJson(x.fetch, `${base}${x.region}/latest.json`),
    ...[1, 0].map((o) => getJson(x.fetch, `${base}${x.region}/${series}/hourly/${day(o)}.json`)),
  ]);
  if (!isLatest(latest)) return fromCache(readCache(x.storage), series);
  const hourly = days.filter(isHourly);
  writeCache(x.storage, { v: 1, fetchedAt: x.now, region: x.region, series, latest, hourly });
  return { latest, hourly: { [series]: hourly } };
}

const two = (n: number) => String(n).padStart(2, "0");

// The header's freshness line, in the device's local time: "prices 10:00", or "prices from 6 h ago"
export function asOfText(a: { ts: number; stale: boolean } | null, now: number): string {
  if (!a) return "";
  if (!a.stale) { const d = new Date(a.ts); return `prices ${two(d.getHours())}:${two(d.getMinutes())}`; }
  const h = Math.round((now - a.ts) / 36e5);
  return h < 48 ? `prices from ${h} h ago` : `prices from ${Math.round(h / 24)} d ago`;
}
