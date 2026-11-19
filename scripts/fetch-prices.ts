// T3 price pipeline: reads WoW Forever auction houses from the Blizzard Game Data API.
// Runs with Node's built-in TypeScript support: node scripts/fetch-prices.ts --mode probe
// Credentials come only from the environment (BNET_CLIENT_ID, BNET_CLIENT_SECRET) and are never printed.
// Endpoints and house IDs: planning/t3/research/blizzard-api.md and docs/SOURCES.md.
//
// Modes (more arrive in later T3 steps):
//   probe  read-only: token, ruleset index, house index, two houses with and without /commodities.
//          Prints shapes, counts and header names. With --save-fixture <dir>, writes trimmed
//          responses (tracked materials kept) for the pipeline's tests.
//   run    reads each house's /commodities, reduces the tracked materials to stats and pools them
//          into the four series. --fixtures <dir> reads saved responses (house-<id>-commodities.json;
//          a missing file is a house not read) instead of the API. --out <dir> merges the point into
//          <dir>/<region>/{latest.json, <series>/hourly/<day>.json, <series>/daily/<month>.json} and
//          rebuilds that day's and the previous day's daily rows. If no house's snapshot moved since
//          latest.json, nothing is written. --dry prints the summary and sample rows instead.

import fs from "node:fs";
import path from "node:path";
import { getJson, getToken, type Deps, type JsonResult } from "../src/pipeline/http.ts";
import { SERIES, SERIES_IDS } from "../src/pipeline/houses.ts";
import { listingsFrom } from "../src/pipeline/reduce.ts";
import { pool, type HouseListings, type SeriesPoint } from "../src/pipeline/series.ts";
import { changed, pointHour } from "../src/pipeline/snapshot.ts";
import { buildLatest, formatFile, mergeDaily, mergeHourly, rollDay, type DailyFile, type HourlyFile, type Latest, type Point } from "../src/pipeline/files.ts";
import type { SeriesId } from "../src/pipeline/houses.ts";

const REGION = "us";
const API = `https://${REGION}.api.blizzard.com`;
const NS = `namespace=dynamic-forever-${REGION}&locale=en_US`;
const RULESET = 2;
const PROBE_HOUSES = [110, 112]; // a busy Alliance house, and one reported to omit `auctions` at times
const DELAY_MS = 1000;

type Auction = { id?: number; item?: { id?: number }; buyout?: number; bid?: number; unit_price?: number; quantity?: number; time_left?: string };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// Space requests out (about one a second) on top of the retry pauses
const deps: Deps = { fetch: async (url, init) => { await sleep(DELAY_MS); return fetch(url, init); }, sleep };

function tracked(): Set<number> {
  const map = JSON.parse(fs.readFileSync("data/items.json", "utf8")) as Record<string, unknown>;
  return new Set(Object.entries(map).filter(([k]) => !k.startsWith("_")).map(([, v]) => v as number));
}

function credentials(): [string, string] {
  const id = process.env.BNET_CLIENT_ID, secret = process.env.BNET_CLIENT_SECRET;
  if (!id || !secret) {
    console.error("Set BNET_CLIENT_ID and BNET_CLIENT_SECRET in the environment first.");
    process.exit(2);
  }
  return [id, secret];
}

async function tryGet(url: string, token: string): Promise<JsonResult | { error: string }> {
  try { return await getJson(url, token, deps); } catch (e) { return { error: (e as Error).message }; }
}

function describeAuctions(list: Auction[], ids: Set<number>) {
  const keys = new Set<string>();
  let buyout = 0, bidOnly = 0, unitPrice = 0, trackedListings = 0;
  const trackedItems = new Set<number>();
  for (const a of list) {
    Object.keys(a).forEach((k) => keys.add(k));
    if (a.unit_price != null) unitPrice++;
    else if (a.buyout != null) buyout++;
    else bidOnly++;
    const id = a.item?.id;
    if (id != null && ids.has(id)) { trackedListings++; trackedItems.add(id); }
  }
  return { count: list.length, keys: [...keys].sort(), buyout, unitPrice, bidOnly, trackedListings, trackedItems: trackedItems.size };
}

// Keep tracked materials (up to 400 listings), plus a few untracked and bid-only ones, so the fixture
// stays small but covers every case the reducer must handle.
function trim(list: Auction[], ids: Set<number>): Auction[] {
  const mine = list.filter((a) => a.item?.id != null && ids.has(a.item.id)).slice(0, 400);
  const other = list.filter((a) => !(a.item?.id != null && ids.has(a.item.id))).slice(0, 10);
  const bidOnly = list.filter((a) => a.buyout == null && a.unit_price == null).slice(0, 5);
  const seen = new Set<unknown>();
  return [...mine, ...other, ...bidOnly].filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}

// `listings` is false for the house index, whose `auctions` key lists houses, not listings
function saveFixture(dir: string, name: string, res: JsonResult, ids: Set<number>, listings = true) {
  const body = res.body as Record<string, unknown>;
  const out: Record<string, unknown> = { ...body };
  if (listings && Array.isArray(body.auctions)) out.auctions = trim(body.auctions as Auction[], ids);
  if (listings && Array.isArray(body.commodities)) out.commodities = trim(body.commodities as Auction[], ids);
  const headers = { "last-modified": res.headers.get("last-modified"), date: res.headers.get("date") };
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify({ headers, body: out }, null, 2) + "\n");
  console.log(`  saved ${path.join(dir, `${name}.json`)}`);
}

async function probe() {
  const [id, secret] = credentials();
  const ids = tracked();
  const fixtureDir = arg("save-fixture");
  const token = await getToken(id, secret, deps);
  console.log("token: ok");

  const rulesets = await tryGet(`${API}/data/wow/ruleset/index?${NS}`, token);
  if ("error" in rulesets) console.log(`ruleset index: ${rulesets.error}`);
  else {
    const list = ((rulesets.body as { rulesets?: { id: number; name?: string }[] }).rulesets) ?? [];
    console.log(`ruleset index: keys ${Object.keys(rulesets.body as object).join(", ")}; ids ${list.map((r) => `${r.id} ${r.name ?? ""}`.trim()).join(", ")}`);
  }

  const index = await tryGet(`${API}/data/wow/ruleset/${RULESET}/auctions/?${NS}`, token);
  if ("error" in index) { console.log(`house index: ${index.error}`); process.exit(1); }
  const houses = ((index.body as { auctions?: { id: number; name: string }[] }).auctions) ?? [];
  console.log(`house index (ruleset ${RULESET}): ${houses.length} houses: ${houses.map((h) => `${h.id} ${h.name}`).join("; ")}`);
  if (fixtureDir) saveFixture(fixtureDir, "index", index, ids, false);

  for (const house of PROBE_HOUSES) {
    for (const suffix of ["", "/commodities"]) {
      const label = `house ${house}${suffix}`;
      const res = await tryGet(`${API}/data/wow/ruleset/${RULESET}/auctions/${house}${suffix}?${NS}`, token);
      if ("error" in res) { console.log(`${label}: ${res.error}`); continue; }
      const body = res.body as Record<string, unknown>;
      console.log(`${label}: top-level keys ${Object.keys(body).join(", ")}`);
      console.log(`  headers: ${[...res.headers.keys()].join(", ")}`);
      console.log(`  last-modified: ${res.headers.get("last-modified") ?? "(none)"}`);
      for (const field of ["auctions", "commodities"]) {
        if (Array.isArray(body[field])) console.log(`  ${field}: ${JSON.stringify(describeAuctions(body[field] as Auction[], ids))}`);
        else if (field in body) console.log(`  ${field}: ${JSON.stringify(body[field]).slice(0, 200)}`);
      }
      if (fixtureDir) saveFixture(fixtureDir, `house-${house}${suffix ? "-commodities" : ""}`, res, ids);
    }
  }
  console.log("probe done");
}

type HouseRead = { body: unknown; lastModified: string | null };

// One house's commodities, from a saved fixture or the API. null = not read (missing file, or failed after retries).
async function readHouse(house: number, source: { fixtures?: string; token?: string }): Promise<HouseRead | null> {
  if (source.fixtures) {
    const file = path.join(source.fixtures, `house-${house}-commodities.json`);
    if (!fs.existsSync(file)) return null;
    const saved = JSON.parse(fs.readFileSync(file, "utf8")) as { headers?: Record<string, string | null>; body: unknown };
    return { body: saved.body, lastModified: saved.headers?.["last-modified"] ?? null };
  }
  const res = await tryGet(`${API}/data/wow/ruleset/${RULESET}/auctions/${house}/commodities?${NS}`, source.token as string);
  if ("error" in res) { console.warn(`house ${house}: ${res.error}`); return null; }
  return { body: res.body, lastModified: res.headers.get("last-modified") };
}

function readJson<T>(file: string): T | null {
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as T) : null;
}
function writeFile(file: string, data: object) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, formatFile(data));
}
const dayBefore = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 864e5).toISOString().slice(0, 10);

// Merge one series' point into its day file and rebuild that day's and the previous day's daily rows
function writeSeries(out: string, series: SeriesId, point: Point) {
  const meta = { region: REGION, series };
  const dir = path.join(out, REGION, series);
  const date = point.ts.slice(0, 10);
  const hourlyPath = (d: string) => path.join(dir, "hourly", `${d}.json`);
  writeFile(hourlyPath(date), mergeHourly(readJson<HourlyFile>(hourlyPath(date)), point, meta));
  for (const d of [dayBefore(date), date]) {
    const hourly = readJson<HourlyFile>(hourlyPath(d));
    if (!hourly) continue;
    const dailyPath = path.join(dir, "daily", `${d.slice(0, 7)}.json`);
    writeFile(dailyPath, mergeDaily(readJson<DailyFile>(dailyPath), rollDay(hourly), meta));
  }
}

async function run() {
  const dry = process.argv.includes("--dry");
  const out = arg("out");
  if (!dry && !out) { console.error("run needs --out <dir> (or --dry)"); process.exit(2); }
  const ids = tracked();
  const fixtures = arg("fixtures");
  const source = fixtures ? { fixtures } : { token: await getToken(...credentials(), deps) };
  const perHouse: HouseListings = new Map();
  const snapshots: Record<number, string> = {};
  for (const house of SERIES.all) {
    const read = await readHouse(house, source);
    if (!read) continue;
    perHouse.set(house, listingsFrom(read.body, ids));
    if (read.lastModified) snapshots[house] = new Date(read.lastModified).toISOString();
  }
  if (!perHouse.size) { console.error("no house could be read"); process.exit(1); }
  const items = [...ids];
  const series = Object.fromEntries(SERIES_IDS.map((s) => [s, pool(perHouse, SERIES[s], items)])) as Record<SeriesId, SeriesPoint>;
  const ts = pointHour(snapshots) ?? new Date().toISOString().slice(0, 13) + ":00:00Z";
  const priced = items.filter((id) => series.all.items[id]).length;
  const missing = SERIES.all.filter((h) => !perHouse.has(h));
  const summary = `${ts} ${perHouse.size}/${SERIES.all.length} houses, ${priced}/${items.length} items${missing.length ? ` (not read: ${missing.join(", ")})` : ""}`;

  if (dry) {
    console.log(summary);
    for (const s of SERIES_IDS) console.log(`  ${s}: ${series[s].houses}/${SERIES[s].length} houses`);
    const names = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync("data/items.json", "utf8")) as Record<string, unknown>).map(([k, v]) => [v, k]));
    console.log("  sample rows (all), [min, p10, p25, median, qty, listings] in copper:");
    for (const id of items.filter((id) => series.all.items[id]).slice(0, 5)) console.log(`    ${names[id]} (${id}): ${JSON.stringify(series.all.items[id])}`);
    return;
  }

  const latestPath = path.join(out as string, REGION, "latest.json");
  const prev = readJson<Latest>(latestPath);
  if (!changed(prev?.snapshots ?? null, snapshots)) { console.log(`${summary}: no new snapshot, nothing written`); return; }
  const points = Object.fromEntries(SERIES_IDS.map((s) => [s, { ts, src: "bnet", houses: series[s].houses, items: series[s].houses ? series[s].items : {} }])) as Record<SeriesId, Point>;
  for (const s of SERIES_IDS) if (series[s].houses) writeSeries(out as string, s, points[s]);
  writeFile(latestPath, buildLatest(REGION, points, { ...(prev?.snapshots ?? {}), ...snapshots }, new Date().toISOString()));
  console.log(summary);
}

const mode = arg("mode");
if (mode === "probe") await probe();
else if (mode === "run") await run();
else { console.error(`Unknown or missing --mode (${mode ?? "none"}). Available now: probe, run`); process.exit(2); }
