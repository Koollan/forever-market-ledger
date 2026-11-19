# Sources

Every game or market datum the app uses names its source here or in a code comment. Guesses are marked `est: true`.

## Market data

| Data | Source | Terms | Notes |
|---|---|---|---|
| US price history for all 136 catalogued materials, daily from Nov 13 and hourly from Nov 13 17:00 UTC, 2026 (min, p10, median, mean, quantity, listings) | [Forever AH API](https://forever-ah.com/api/), US house 17 "All Auction Houses" | Free, no key. Asks for ~1 request/second, caching, and credit to "Forever AH" and Blizzard's Battle.net API | One-time backfill (T0), Nov 18, 2026. Files in `data/backfill/forever-ah/`. Item IDs from its `/v1/items/search`. Imported into the `prices` branch's `us/all` series (tagged `fah`, `p25` null) by the workflow's `import` mode. One more run closes the gap to T3's first hour (T3 step 6, planned) |
| Live prices for the 136 catalogued materials, hourly from T3's first run (min, p10, p25, median, quantity, listings) | Blizzard Game Data API: `https://us.api.blizzard.com/data/wow/ruleset/2/auctions/{houseId}/commodities`, namespace `dynamic-forever-us`, client-credentials token from `https://oauth.battle.net/token` | Blizzard API terms; 36,000 requests/hour (a run uses 17: a token, the house index and 15 houses) | `.github/workflows/prices.yml`, hourly at :40 UTC, into the orphan `prices` branch (`us/latest.json`, `us/{series}/hourly/{day}.json`, `us/{series}/daily/{month}.json`). Houses: Alliance 110, 111, 112, 119, 123; Horde 113, 114, 115, 120, 124; Blackwater 116, 117, 118, 121, 125 (Blizzard's house index; 122 does not exist). Materials are commodities (`unit_price`), and `Last-Modified` is the snapshot time (probe, Nov 19, 2026: `planning/t3/research/probe.md`). Endpoint paths from developer reports while Blizzard's Forever docs are missing: [forum thread](https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334) |
| Item IDs of the catalogued materials (`data/items.json`) | Forever AH `/v1/items/search` | As above | Recorded by the T0 backfill; Blizzard's static item API is not used (it 404s for many Forever items) |

**Data credit:** price history from [Forever AH](https://forever-ah.com/), using Blizzard's Battle.net API. Not affiliated with Blizzard Entertainment.

## Checked and not used

| Site | Why not |
|---|---|
| [Booty Bay Broker](https://bootybaybroker.com/terms) | Terms of Service v1.22 (Nov 15, 2026), section 4, forbid bots, scrapers or any automated means to collect data |
| [auctionhouse.fyi](https://auctionhouse.fyi/docs/api) | Public API, but player-uploaded and sparse (US history from ~Nov 12 with gaps, 8 contributors a week). Possible later cross-check |
| [Undermine Exchange](https://undermine.exchange/api.html) | Retail only |

Not yet checked: Azeroth Auctions, wowfah.com, AHledger, TheWoWDB, Forever Mastery.

## Game data

See `docs/SPEC.md` section 5 until each source moves here.
