# Handoff: T3 (Blizzard API price pipeline)

Nov 19, 2026. T3 is done: planned, built in two PRs, reviewed, merged and running.

## Where things stand
- **PR A** (Koollan/forever-market-ledger#3, merged Nov 19 05:12 UTC): `.github/workflows/prices.yml` runs hourly at :40 UTC and writes `us/latest.json`, `us/{alliance,horde,blackwater,all}/hourly/{day}.json` and `…/daily/{month}.json` to the orphan `prices` branch. The first scheduled run went at 05:43 UTC; GitHub ran it about 3 minutes late.
- **PR B** (Koollan/forever-market-ledger#4, merged Nov 19 06:00 UTC, deployed to Pages): the app fetches those files, caches them in `fml-prices`, and shows a "prices as of" header line, the API price on the material sheet (source, min/median, 24-hour line, Blackwater hint) and a Market list on the Prices tab. Advice uses API prices when they apply.
- **History:** `us/all` is hourly from Nov 13, 2026 17:00 UTC with no gaps. Forever AH supplied Nov 13 to Nov 19 03:00, through the T0 backfill and the step-6 gap run. Blizzard supplies Nov 19 04:00 onward. For the hour both sources cover, they agree within 2% on every stat for all 136 materials.
- **Faction series** (`alliance`, `horde`, `blackwater`) start at Nov 19 04:00.

## Decisions to remember
All 18 grill decisions are in `idea-honing.md`. Later changes:
- **Cron at :40, not :17:** Blizzard's snapshots land around :25 (probe, Nov 19).
- **Materials are commodities:** the run reads only `/auctions/{house}/commodities`, plus the house index, which it compares with the fixed list and warns on any difference. That's 17 requests per run.
- **Snapshot time:** API data is dated by the series' newest house snapshot within its hour. Your price wins while it is newer than that and under 24 h old. API prices more than 24 h old don't drive prices or advice.
- **Sell advice scope:** sell advice covers your priced materials plus what the character gathers that has an API price (chosen by the owner in step 10).
- **Blackwater hint:** shown only when Blackwater is more than 5% better (selling compares after the 15% vs 5% cuts; buying compares listed prices).

## How to operate it
- **Manual runs:** Actions → Prices → Run workflow: `run` (one fetch), `probe` (read-only shapes), `import` (Forever AH backfill folders into `us/all`, safe to repeat), `squash` (monthly; also scheduled for 00:47 UTC on the 1st).
- **Failure emails:** GitHub emails the owner when a run fails (bad token, no house readable). Partial failures don't send email; they show as `::warning::` on the run and in the commit message (a house not read, missing `Last-Modified`, house index differs).
- **Credentials:** `BNET_CLIENT_ID` and `BNET_CLIENT_SECRET` live only in repo secrets and the owner's terminal. To check the live API locally, the owner runs `node scripts/fetch-prices.ts --mode probe` or `--mode run --dry`.
- **Tests never touch the network:** e2e specs import `test` from `tests/e2e/test.ts` (404s the price fetch); `servePrices` serves `tests/fixtures/prices/`.

## Next
- **T4 (calibrate the conditions engine):** needs 2+ weeks of hourly data. Faction series reach two weeks around Dec 3, 2026; `us/all` already has data from Nov 13. Files are columnar per UTC day, tagged `bnet`/`fah` per row, ready for per-weekday and per-hour slicing.
- **Watch the first squash** on Dec 1, 00:47 UTC: the `prices` branch should end with one commit holding the same files.
- **T6** still owes the catalog names of the four renamed elixirs (item IDs already right in `data/items.json`).
- **Not done (by decision):** EU prices (a config change in `scripts/fetch-prices.ts` and `homeSeries`), per-house series, and alerts beyond GitHub's failed-run email.

## Where to read more
`summary.md` (overview), `design/detailed-design.md` (data formats, rules, error handling), `implementation/plan.md` (10 steps, all done), `research/probe.md` (live API facts and the Forever AH cross-check).
