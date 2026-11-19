# Idea honing: T3

Decisions from the `/grill-me` session on Nov 18, 2026. Each question was put to the user with a recommendation; the user accepted every recommendation ("yes, all" for rounds 1 and 2, "yes, both" for round 3).

## Round 1

**Q1. Which houses to track?** Options: (a) US region-wide view only, as in T0; (b) four series: Alliance (5 houses pooled), Horde (5), Blackwater (5) and All (15); (c) all 15 houses separately plus All. Every run must download all 15 houses anyway.
**Answer:** (b). No public mapping says which of the five same-faction houses a character uses, so per-house numbers are not actionable. The app reads the character's faction series and compares Blackwater after its 15% cut.

**Q2. Where does the data live and how does the app load it?** Options: (a) commit to `main` and bundle at build time (24 commits/day on `main`, each needing a gated deploy); (b) an orphan `prices` branch, fetched at runtime from `raw.githubusercontent.com`; (c) deploy data into the Pages artifact from the cron.
**Answer:** (b). The last good copy is cached in a new `localStorage` key `fml-prices` (not in `fml-cache`, so Backup does not grow).

**Q3. Region?** **Answer:** US only. The region is a parameter, so EU is a config change later.

**Q4. Cron frequency?** **Answer:** hourly at minute :17, plus `workflow_dispatch`. Points are keyed by Blizzard's snapshot time, not the run time; an unchanged snapshot writes nothing.
**Update (Nov 19, after the step-1 probe):** snapshots land about :25 past the hour, so the user moved the run to minute :40 to read each hour's snapshot about 15 minutes after it lands.

**Q5. Stats per item and series?** **Answer:** `min, p10, p25, median, qty, listings`; percentiles weighted by quantity, buyout per unit only (bid-only listings skipped), copper. `mean` dropped (outliers). Converted T0 points get `p25: null`.

**Q6. Which number is "the price"?** **Answer:** `p10` drives buy and sell advice; the material sheet also shows `min` and `median`.

**Q7. How do manual prices override API prices?** Options: (a) manual always wins; (b) manual wins while newer than the latest API point and under 24 h old, then the API takes over and the manual entry stays in history; (c) blend both into one estimate.
**Answer:** (b). The Prices tab labels the source ("API · 40 min ago", "You · 2 h ago").

**Q8. Failure handling?** **Answer:** 3 retries with backoff per request (429 and 5xx retryable). A failed house is left out of that run's series, and the point records `houses: n/15`. A token or index failure writes nothing and fails the run, so GitHub emails the owner; no other alerting. The app shows "prices as of <time>", and flags them as stale past 3 h. Gaps stay gaps.

**Q9. Battle.net credentials?** **Answer:** the user creates the client at develop.battle.net and adds `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` as repository secrets, when implementation reaches step 1. The agent never sees or handles the values. A manual probe run logs only shapes and counts.

## Round 2

**Q10. File layout?** **Answer:** on the `prices` branch: `us/latest.json` (newest point of all four series); `us/{series}/hourly/{yyyy-mm-dd}.json` (one per UTC day, columnar: `ts[]`, `houses[]`, and per item ID rows `[min,p10,p25,median,qty,listings]` or `null` aligned with `ts`); `us/{series}/daily/{yyyy-mm}.json` (one row per UTC day: min of hourly mins, medians of hourly p10/p25/median, means of qty and listings, `n` hours). The hourly job rebuilds yesterday's and today's daily rows.

**Q11. Retention and repo size?** Options: (a) keep everything, never squash; (b) keep all hourly files, and on the 1st of each month the workflow replaces the `prices` branch history with one commit of the current files.
**Answer:** (b). Hourly files are kept forever (T4 needs per-hour data). The monthly force-push touches only the `prices` branch, never `main`.

**Q12. T0 conversion and the gap?** **Answer:** a one-off conversion turns `data/backfill/forever-ah/us-all/*.json` into `us/all/` hourly and daily files tagged `source: "forever-ah"` (with `p25` and `houses` null). Close the gap between T0's end (Nov 19 00:00 UTC) and T3's first run with one more backfill run at Forever AH's stated limits, just before T3 goes live, recorded in `docs/SOURCES.md`.

**Q13. Item IDs and names?** **Answer:** move `data/backfill/forever-ah/item-ids.json` to `data/items.json` on `main` (name → ID, source noted). The pipeline uses it to filter auctions and the app bundles it. No calls to Blizzard's static item API. The four renamed elixirs wait for T6.

**Q14. Code layout?** **Answer:** `src/pipeline/` (pure TypeScript: reduce, pool into series, update hourly/daily files, convert T0; Vitest with a recorded fixture); `scripts/fetch-prices.ts` (network and files, run with Node 24's built-in TypeScript support); `.github/workflows/prices.yml` (the only workflow with `contents: write`, writing only to `prices`); `src/engine/market.ts` (pure: series choice, override, staleness, Blackwater comparison); `src/ui/prices.ts` (fetch and cache).

**Q15. App changes?** **Answer:** material sheet: active price with source label, 24-point `p10` sparkline for the home series, `min` and `median`, and the Blackwater hint ("Blackwater: 1g 20s after 15% cut, 8% better"). Prices tab: manual entries as now plus a **Market** list of API prices for materials this character gathers or needs. Sell and buy windows use the active price as base under the same conditions engine. A "prices as of" line with a stale state past 3 h.

**Q16. Tests and the behavior lock?** **Answer:** e2e stubs the price fetch. With an empty stub the existing baseline stays byte-identical. A new e2e case uses a recorded `latest.json` and day file and checks the Market list, sparkline and stale label at 412px, light and dark. CI never calls Blizzard.

## Round 3

**Q17. Shipping order?** Scheduled workflows run only from `main`, so collection starts only when `prices.yml` merges. **Answer:** split T3 into two PRs in sequence (an exception to one PR per task, T3 only): PR A `t3/pipeline` (probe, reducer, fetch script, workflow, T0 conversion, gap run), merged first so data starts; PR B `t3/app` (market engine, loader, UI, tests). The first scheduled run creates the orphan `prices` branch.

**Q18. EU characters?** **Answer:** they stay on manual prices; the material sheet says "API prices are US only for now". The loader takes the region from the character.

## Facts left for the step-1 probe
- Whether materials are listed under `/auctions/{houseId}` or `/auctions/{houseId}/commodities` (the reducer accepts both shapes).
- Whether house responses carry `Last-Modified` (snapshot time); otherwise the run time floored to the hour.
- That ruleset 2 is a valid ID to call (all rulesets return the same houses).
