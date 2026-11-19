# Implementation plan: T3

## Checklist

- [x] Step 1: Item map, Battle.net client and a read-only probe (PR A). Findings in `research/probe.md`: materials are commodities, `Last-Modified` is the snapshot time, ruleset 2 is valid
- [x] Step 2: Reduce listings to stats and pool into series (PR A)
- [x] Step 3: Hourly, daily and latest files written by a full run (PR A)
- [x] Step 4: Convert the T0 backfill (PR A)
- [x] Step 5: The hourly workflow and the `prices` branch; ship PR A (PR A). Merged as Koollan/forever-market-ledger#3 on Nov 19, 2026; probe, first run (04:00 UTC, 15/15 houses) and T0 import dispatched the same morning
- [x] Step 6: Close the gap after T0 (PR B). Gap files in `data/backfill/forever-ah/us-all-gap/`; imported on Nov 19, 2026 after PR B merged (us/all is hourly from Nov 13 with no gaps)
- [x] Step 7: Market rules in the engine (PR B)
- [x] Step 8: Load and cache prices; "prices as of" line (PR B)
- [x] Step 9: Material sheet: API price, sparkline, Blackwater hint (PR B)
- [x] Step 10: Market list and advice from API prices; ship PR B (PR B). Merged as Koollan/forever-market-ledger#4 on Nov 19, 2026, deployed to Pages

Steps 1–5 are branch `t3/pipeline` (PR A). Merging it starts hourly collection, the clock T4 waits on, so it goes first and stays free of app changes. Steps 6–10 are branch `t3/app` (PR B), started from `main` after PR A merges. One commit per step; `npm run check` green after every step, and the behavior lock (`tests/e2e/baseline.spec.ts`) unchanged throughout. Never push or open a PR without asking.

---

## Step 1: Item map, Battle.net client and a read-only probe (PR A)

**Objective:** settle the three open API facts (commodities vs auctions path for materials, `Last-Modified` on house responses, ruleset 2) before any reducer is written, and record a trimmed real fixture.

**Guidance:**
- Move `data/backfill/forever-ah/item-ids.json` to `data/items.json` with a `_source` key; point `scripts/backfill-forever-ah.mjs` at the new path.
- `src/pipeline/http.ts`: `getJson(url, {token, fetch, sleep})` with 3 retries, backoff, and `Retry-After` on 429; `getToken(id, secret, fetch)`. Inject `fetch` and `sleep` so tests need no network.
- `scripts/fetch-prices.ts --mode probe`: token → index → one busy house and its `/commodities` path. Prints keys, counts, whether tracked IDs appear in each, and header names. Also `--save-fixture <dir>` writes trimmed responses (a few hundred auctions, tracked items kept) to `tests/fixtures/auctions/`.
- **User setup (the owner does this; the agent never sees the values):** create a client at https://develop.battle.net/access/clients (no redirect URL needed). Add `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` under the repository's Settings → Secrets and variables → Actions. For the probe, set the same two values as environment variables in your own terminal and run `node scripts/fetch-prices.ts --mode probe --save-fixture tests/fixtures/auctions`.
- Record the probe's answers in `planning/t3/research/probe.md` and adjust the design if a fact differs.

**Tests:** `http.ts` with a fake `fetch`: success, a 503 then success, a 429 with `Retry-After`, giving up after 3 tries, and a token request with Basic auth and the right form body. A test that `data/items.json` holds 136 numeric IDs that match the catalog names in `src/data/materials.ts`.

**Integration:** the backfill script still runs (its path changed). Nothing else depends on the new code yet.

**Demo:** the probe output in the user's terminal, and a committed fixture of real response shapes.

## Step 2: Reduce listings to stats and pool into series (PR A)

**Objective:** pure `houses.ts`, `reduce.ts` and `series.ts` per the design.

**Guidance:** quantity-weighted percentiles; buyout per unit, skipping bid-only; both response shapes; a missing `auctions` field means zero listings. Explicit `.ts` imports and erasable syntax only (enable `allowImportingTsExtensions`). Add `--mode run --fixtures <dir> --dry` to the script: it reads house responses from files and prints the summary line plus a few items' stats, writing nothing.

**Tests (first):** hand-computed percentiles on small listing sets; `null` for no listings; bid-only ignored; pooling 5 houses gives the stats of the combined listings, not their average; the step-1 fixture reduces without errors and finds tracked items.

**Integration:** the script uses the reducer on fixture input.

**Demo:** `node scripts/fetch-prices.ts --mode run --fixtures tests/fixtures/auctions --dry` prints `… 15/15 houses, N/136 items` and sample rows.

## Step 3: Hourly, daily and latest files written by a full run (PR A)

**Objective:** `files.ts` and `snapshot.ts`; `--mode run --out <dir>` writes and merges the three file kinds.

**Guidance:** follow the design's data models exactly (`v: 1`, `fields`, aligned `ts`/`src`/`houses`/rows). Rebuild yesterday's and today's daily rows each run. Skip the write if no snapshot changed. Stable JSON output (sorted item keys, no trailing spaces) so diffs on the `prices` branch stay small. In real-network mode, house requests go out one at a time, about one a second.

**Tests (first):** `mergeHourly` insert, sort and replace by `ts`, with `bnet` replacing `fah` but not the reverse; `rollDay` on a day with missing hours (n counted, medians right); `mergeDaily` replacing a row; `pointHour` flooring; `changed`. A script-level test runs fixtures into a temp dir twice and checks that the second run writes nothing and that the files parse with the expected shapes.

**Integration:** steps 1–3 now make a complete offline run; only the network fetch remains untested in CI.

**Demo:** run the fixtures into a temp folder and open `us/horde/hourly/<date>.json` and `us/latest.json`.

## Step 4: Convert the T0 backfill (PR A)

**Objective:** `convert-t0.ts` and `--mode import --from data/backfill/forever-ah/us-all [--from …]` merging into `us/all`.

**Guidance:** map `min_unit, p10_unit, median_unit, quantity, listings` to the row with `p25: null`; `src: "fah"`, `houses: null`; keep Forever AH's daily points for days with no Blizzard hours; split hourly rows by UTC day. Takes several `--from` folders so the step-6 gap files go through the same path.

**Tests (first):** one real T0 file → expected number of rows per day and correct field order; `p25` null; a Blizzard row at the same `ts` survives an import; importing twice changes nothing.

**Integration:** uses `files.ts` from step 3.

**Demo:** import into a temp folder; `us/all/daily/2026-11.json` shows Nov 13–19.

## Step 5: The hourly workflow and the `prices` branch; ship PR A (PR A)

**Objective:** `.github/workflows/prices.yml` per the design (schedules for run and squash, `workflow_dispatch` modes `run`, `probe`, `import`, `squash`; `contents: write`; concurrency group `prices`; 15 min timeout; orphan branch creation; commit only when there are changes; force-push with lease for squash only).

**Guidance:** the workflow passes secrets as environment variables only to the script step. Update `docs/SOURCES.md` (live prices row: endpoints, houses by faction, cadence, the `prices` branch) and `docs/SPEC.md` (T3 status, the two-PR split, the 7-day roll-up replaced by keeping hourly data). Update `CLAUDE.md`'s layout section with `src/pipeline` and the `prices` branch.

**Tests:** CI stays green (unit tests cover the pipeline). The workflow itself is checked manually after merge.

**Integration:** ask the user before pushing and opening PR A; merge when CI is green. Then the user (or the agent, with approval) dispatches `probe`, then `run`, and checks the first commit on `prices`; then dispatches `import` to load T0.

**Demo:** the `prices` branch on GitHub with `us/latest.json`, four series' hourly files for today, and `us/all` back to Nov 13. Scheduled runs add a commit every hour.

---

## Step 6: Close the gap after T0 (PR B)

**Objective:** Forever AH history from Nov 19 00:00 UTC to the first Blizzard hour, in `us/all`.

**Guidance:** only after the first scheduled Blizzard run has succeeded. Add `--from <iso>` and `--out <dir>` options to `scripts/backfill-forever-ah.mjs` and run it once into `data/backfill/forever-ah/us-all-gap/` at its existing ~1 request/second. Record the run in `docs/SOURCES.md`. Dispatch the workflow's `import` mode on the `t3/app` ref (once `prices.yml` exists on `main`, a dispatch can run from another branch), reading both folders.

**Tests:** the step-4 tests cover the conversion; check by eye that the hours overlap the first Blizzard hour and the Blizzard rows win.

**Integration:** raw gap files are committed on `t3/app` and merge with PR B.

**Demo:** `us/all/hourly/` has no hole between Nov 19 and the first Blizzard run.

## Step 7: Market rules in the engine (PR B)

**Objective:** pure `src/engine/market.ts` (`homeSeries`, `activePrice`, `history`, `blackwaterHint`, `asOf`) and the optional `market` argument to `estimate`.

**Guidance:** the file types are shared with `src/pipeline` (import its types, not its I/O). The AH cuts come from `HOUSES` in `src/data/consumables.ts`. With `market` absent, `estimate` must return exactly what it does today.

**Tests (first):** the manual-override cases (newer and under 24 h wins; over 24 h or older than the API point loses; no API value falls back); `estimate` with an API price gives `now = p10` and windows scaled by conditions; `estimate` without `market` equals the recorded baseline outputs for the reference characters; `blackwaterHint` for sell (after 15% vs 5% cuts) and buy, at and around the 5% threshold; `asOf` stale past 3 h; `homeSeries` null for EU; `history` with missing hours gives nulls.

**Integration:** nothing in the UI calls it yet; the baseline stays green.

**Demo:** `npm test` shows the new suite.

## Step 8: Load and cache prices; "prices as of" line (PR B)

**Objective:** `src/ui/prices.ts` (fetch with timeout, `fml-prices` cache, refresh on visibility after 30 min), wired into `main.ts` after the first render, and the header's "prices as of" line with its stale state.

**Guidance:** the first paint never waits on the network; re-render when prices arrive. In every e2e spec, stub `raw.githubusercontent.com`: 404 by default (a shared Playwright fixture), so the baseline sees no data. Check the header line at 412 px.

**Tests:** unit tests for the cache read/write and version check with a fake storage; e2e: with the 404 stub, the baseline is byte-identical and no console errors; with a recorded `latest.json` stub (from a real `prices` commit, saved under `tests/fixtures/prices/`), the header shows "prices as of …"; with the clock 5 h ahead, it reads as stale; reload offline uses the cache.

**Integration:** uses step 7's `asOf` and the files step 5 produces.

**Demo:** the Pages preview build shows a live "prices as of" line from the real `prices` branch.

## Step 9: Material sheet: API price, sparkline, Blackwater hint (PR B)

**Objective:** the material sheet shows the active price with its source label, `min · median`, a 24-point `p10` sparkline (inline SVG) of the home series, the Blackwater hint, and the EU note.

**Guidance:** one column at 412 px; the sparkline scales to width and has an accessible label ("Price, last 24 hours"); null hours are breaks in the line, not zeros. Colors from the existing theme tokens, so dark mode works.

**Tests (first):** e2e with stubbed files for the L24 Horde Hunter: the sheet for Light Leather shows "API · …", the sparkline has 24 points, the Blackwater hint appears when the stub makes Blackwater better, and does not appear when it doesn't; a manual entry made 1 h ago shows "You · 1 h ago"; an EU character sees the note. Screenshots at 412×900, light and dark.

**Integration:** uses `activePrice`, `history` and `blackwaterHint` from step 7 and the loader from step 8.

**Demo:** open a material on a phone and compare its price with Forever AH by eye.

## Step 10: Market list and advice from API prices; ship PR B (PR B)

**Objective:** the Prices tab's **Market** list (materials the character gathers or needs, tap opens the sheet), and `SugCtx.market` passed through `sellAdvice`, `todaySuggestions` and `sessionPlan` to `estimate`.

**Guidance:** the list comes from the same functions the Farm and Professions tabs use (`whereGather`, `needsFor`). Update `docs/SPEC.md` (sections 2, 3, 5 and T3 done) and `docs/SOURCES.md`.

**Tests (first):** an engine test that `sellAdvice` with an API price gives the same hold/list rule against the API base; e2e for the Market list at 412 px, light and dark; the baseline with the 404 stub still byte-identical.

**Integration:** completes T3. Ask before pushing and opening PR B; merge when CI is green.

**Demo (acceptance):** 24 h after PR A's first run, the deployed app shows real current prices with a 24-point history for the reference characters' materials; `us/*/hourly/` holds a full day for all four series.
