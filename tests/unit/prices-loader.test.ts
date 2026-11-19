// Loading API prices into the app: the device cache, the loader (fake fetch and storage), the header text
import { describe, expect, it } from "vitest";
import { asOfText, loadPrices, readCache, writeCache, PRICES_KEY, type PriceCache } from "../../src/ui/prices";

const BASE = "https://example.test/prices/";
const at = (iso: string) => Date.parse(iso);
const now = at("2026-11-20T15:40:00Z"); // 10:40 in New York

function fakeStorage(init: Record<string, string> = {}) {
  const data = { ...init };
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
}
const latest = { v: 1, region: "us", ts: "2026-11-20T15:00:00Z", generated_at: "2026-11-20T15:41:00Z", snapshots: {},
  fields: ["min", "p10", "p25", "median", "qty", "listings"], series: { horde: { ts: "2026-11-20T15:00:00Z", houses: 5, items: { 2447: [20, 32, 40, 60, 100, 10] } } } };
const day = (date: string) => ({ v: 1, region: "us", series: "horde", date, fields: [], ts: [`${date}T15:00:00Z`], src: ["bnet"], houses: [5], items: { 2447: [[20, 32, 40, 60, 100, 10]] } });

// Serves `files` by URL; anything else is a 404. `throws` makes every request fail as if offline.
function fakeFetch(files: Record<string, unknown>, opts: { throws?: boolean; status?: Record<string, number> } = {}) {
  const urls: string[] = [];
  const fetch = async (url: string) => {
    urls.push(url);
    if (opts.throws) throw new TypeError("Failed to fetch");
    const status = opts.status?.[url] ?? (url in files ? 200 : 404);
    return new Response(status === 200 ? JSON.stringify(files[url]) : "nope", { status });
  };
  return { fetch, urls };
}
const allFiles = {
  [`${BASE}us/latest.json`]: latest,
  [`${BASE}us/horde/hourly/2026-11-20.json`]: day("2026-11-20"),
  [`${BASE}us/horde/hourly/2026-11-19.json`]: day("2026-11-19"),
};

describe("price cache", () => {
  it("round-trips through storage", () => {
    const s = fakeStorage();
    const cache: PriceCache = { v: 1, fetchedAt: now, region: "us", series: "horde", latest: latest as never, hourly: [] };
    writeCache(s, cache);
    expect(readCache(s)).toEqual(cache);
    expect(Object.keys(s.data)).toEqual([PRICES_KEY]);
  });

  it("ignores broken JSON, an unknown version, a missing entry, and storage that throws", () => {
    expect(readCache(fakeStorage({ [PRICES_KEY]: "{not json" }))).toBeNull();
    expect(readCache(fakeStorage({ [PRICES_KEY]: JSON.stringify({ v: 2 }) }))).toBeNull();
    expect(readCache(fakeStorage())).toBeNull();
    expect(readCache({ getItem: () => { throw new Error("blocked"); }, setItem: () => {} })).toBeNull();
  });
});

describe("loadPrices", () => {
  const args = (fetch: (u: string) => Promise<Response>, storage = fakeStorage()) =>
    ({ fetch, storage, now, region: "us", series: "horde" as const, base: BASE });

  it("fetches latest.json and today's and yesterday's hourly file for the home series, and caches them", async () => {
    const { fetch, urls } = fakeFetch(allFiles);
    const storage = fakeStorage();
    const m = await loadPrices(args(fetch, storage));
    expect(urls.sort()).toEqual(Object.keys(allFiles).sort());
    expect(m?.latest?.ts).toBe("2026-11-20T15:00:00Z");
    expect(m?.hourly.horde?.map((f) => f.date)).toEqual(["2026-11-19", "2026-11-20"]);
    expect(readCache(storage)?.fetchedAt).toBe(now);
  });

  it("skips a day file that isn't there yet", async () => {
    const { [`${BASE}us/horde/hourly/2026-11-20.json`]: _, ...noToday } = allFiles;
    const m = await loadPrices(args(fakeFetch(noToday).fetch));
    expect(m?.hourly.horde?.map((f) => f.date)).toEqual(["2026-11-19"]);
  });

  it("keeps the cached copy when latest.json fails, is garbled, or the device is offline", async () => {
    const storage = fakeStorage();
    await loadPrices(args(fakeFetch(allFiles).fetch, storage));
    const cached = storage.data[PRICES_KEY];
    for (const f of [
      fakeFetch(allFiles, { status: { [`${BASE}us/latest.json`]: 500 } }).fetch,
      fakeFetch({ ...allFiles, [`${BASE}us/latest.json`]: { hello: 1 } }).fetch,
      fakeFetch(allFiles, { throws: true }).fetch,
    ]) {
      const m = await loadPrices(args(f, storage));
      expect(m?.latest?.ts).toBe("2026-11-20T15:00:00Z");
      expect(storage.data[PRICES_KEY]).toBe(cached);
    }
  });

  it("is null offline with nothing cached, and for a region without API prices", async () => {
    expect(await loadPrices(args(fakeFetch({}, { throws: true }).fetch))).toBeNull();
    const { fetch, urls } = fakeFetch(allFiles);
    expect(await loadPrices({ ...args(fetch), region: "eu", series: null })).toBeNull();
    expect(urls).toEqual([]);
  });
});

describe("asOfText (New York time)", () => {
  it("shows the API hour when fresh, how old it is when stale, and nothing without data", () => {
    expect(asOfText({ ts: at("2026-11-20T15:00:00Z"), stale: false }, now)).toBe("prices 10:00");
    expect(asOfText({ ts: at("2026-11-20T10:00:00Z"), stale: true }, now)).toBe("prices from 6 h ago");
    expect(asOfText({ ts: at("2026-11-17T15:00:00Z"), stale: true }, now)).toBe("prices from 3 d ago");
    expect(asOfText(null, now)).toBe("");
  });
});
