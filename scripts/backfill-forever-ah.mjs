// One-time backfill of US WoW Forever price history from Forever AH's public API.
// Source: https://forever-ah.com/api/ (free, no key; asks for ~1 request/second and credit
// to "Forever AH" and Blizzard's Battle.net API). See docs/SOURCES.md.
//
// Usage: node scripts/backfill-forever-ah.mjs
// Reads the material names from data/items.json, looks up any missing item IDs, then saves the
// hourly and daily history for the US "All Auction Houses" view into data/backfill/forever-ah/.

import fs from "node:fs";
import path from "node:path";

const API = "https://forever-ah.com/v1";
const HOUSE = 17; // US, ruleset 2, "All Auction Houses" (unified view across houses 110-125)
const FROM = "2026-11-04T00:00:00Z"; // launch; the API returns whatever it has from here
const TO = new Date().toISOString().slice(0, 13) + ":00:00Z";
const OUT = "data/backfill/forever-ah/us-all";
const DELAY_MS = 1100;

// Classic item IDs for catalog names that Forever renamed (search finds no exact match)
const KNOWN_IDS = {
  "Elixir of Lion's Strength": 2454,
  "Elixir of Ogre's Strength": 3391,
  "Elixir of Giants": 9206,
  "Elixir of Superior Defense": 13445,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await sleep(DELAY_MS);
    const res = await fetch(url, { headers: { "User-Agent": "forever-market-ledger-backfill" } });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") || 10) * 1000;
      console.warn(`429, waiting ${wait / 1000}s`);
      await sleep(wait);
      continue;
    }
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
  }
  throw new Error(`gave up after retries: ${url}`);
}

// The catalog's names, as recorded by the first run (the single-file app it read them from is retired).
// To add a material, add its catalog name to data/items.json with a null ID; the run looks the ID up.
function materialNames() {
  return Object.keys(JSON.parse(fs.readFileSync("data/items.json", "utf8"))).filter((k) => !k.startsWith("_"));
}

fs.mkdirSync(OUT, { recursive: true });
const idsFile = "data/items.json";
const ids = fs.existsSync(idsFile) ? JSON.parse(fs.readFileSync(idsFile, "utf8")) : {};
const missing = [];

for (const name of materialNames()) {
  if (!ids[name]) {
    const hits = await get(`${API}/items/search?q=${encodeURIComponent(name)}`);
    let hit = hits.find((h) => h.name.toLowerCase() === name.toLowerCase());
    if (!hit && KNOWN_IDS[name]) {
      // Forever renamed these items; the Classic item ID is the same item
      const item = await get(`${API}/items/${KNOWN_IDS[name]}`).catch(() => null);
      if (item) { hit = item; console.warn(`${name} is "${item.name}" in Forever (item ${item.item_id})`); }
    }
    ids[name] = hit ? hit.item_id : null;
    fs.writeFileSync(idsFile, JSON.stringify(ids, null, 2) + "\n");
  }
  const id = ids[name];
  if (!id) { missing.push(name); console.warn(`no item ID: ${name}`); continue; }

  const file = path.join(OUT, `${id}.json`);
  // resumable: skip files that already hold true hourly data
  if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file, "utf8")).hourly.resolution === "hour") continue;
  const q = `from=${FROM}&to=${TO}`;
  // without resolution=hour the API picks daily points for this range
  const hourly = await get(`${API}/houses/${HOUSE}/items/${id}/history?${q}&resolution=hour`);
  const daily = await get(`${API}/houses/${HOUSE}/items/${id}/history?${q}&resolution=day`);
  fs.writeFileSync(file, JSON.stringify({
    source: "forever-ah",
    credit: "Forever AH (forever-ah.com), data from Blizzard's Battle.net API",
    fetched_at: new Date().toISOString(),
    name, forever_name: hourly.item.name, item_id: id, house: hourly.house,
    hourly: { resolution: hourly.resolution, points: hourly.points },
    daily: { resolution: daily.resolution, points: daily.points },
  }, null, 2) + "\n");
  console.log(`${name} (${id}): ${hourly.points.length} hourly, ${daily.points.length} daily`);
}

console.log(`done. missing IDs: ${missing.length ? missing.join(", ") : "none"}`);
