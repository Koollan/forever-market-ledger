// Keeps API prices current in the app: loads them for the active character's home series, re-renders when
// they change, and refetches when the tab comes back after REFRESH_MS. The first paint never waits on it.
import { S, char } from "./state";
import { render } from "./views";
import { sheetMat } from "./sheets";
import { homeSeries } from "../engine/market";
import { loadPrices, readCache, REFRESH_MS } from "./prices";

// localStorage can be missing or throw (private modes, blocked storage); the cache is optional
const storage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* no cache */ } },
};

let loading = 0;

// Fetch for the active character; re-render (keeping the scroll position) only if the prices changed
export async function refreshPrices() {
  const c = char(), series = homeSeries(c), mine = ++loading;
  const m = await loadPrices({ fetch: (u, i) => fetch(u, i), storage, now: Date.now(), region: c.region || "us", series });
  if (mine !== loading) return; // a newer load (another character) started meanwhile
  const key = (x: typeof m) => JSON.stringify([x?.latest?.generated_at ?? null, x?.hourly && Object.values(x.hourly).map((f) => f?.map((d) => d.ts.length))]);
  const changed = key(m) !== key(S.market);
  S.market = m;
  if (changed) { const v = document.querySelector("#view"), y = v?.scrollTop ?? 0; render(); if (v) v.scrollTop = y; redrawSheet(); }
}

// An open material sheet shows the new prices too, unless you're typing a price into it
function redrawSheet() {
  const open = document.querySelector("#sheet.open"), panel = document.querySelector("#sheetPanel");
  const typing = [...document.querySelectorAll<HTMLInputElement>("#priceForm input")].some((i) => i.value);
  if (!open || !panel || !S.openMat || typing) return;
  const y = panel.scrollTop; sheetMat(S.openMat); panel.scrollTop = y;
}

// Called on every header render: when the home series changes (first paint, another character, a faction
// edit), show the cached copy at once and fetch fresh prices in the background
export function ensurePrices() {
  const c = char(), series = homeSeries(c);
  if (S.pricesSeries === series) return;
  S.pricesSeries = series;
  const cached = series ? readCache(storage) : null;
  S.market = cached ? { latest: cached.latest, hourly: cached.series === series ? { [series]: cached.hourly } : {} } : null;
  void refreshPrices();
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const c = readCache(storage);
  if (!c || Date.now() - c.fetchedAt > REFRESH_MS) void refreshPrices();
});
