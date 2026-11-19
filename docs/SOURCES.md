# Sources

Every game or market datum the app uses names its source here or in a code comment. Guesses are marked `est: true`.

## Market data

| Data | Source | Terms | Notes |
|---|---|---|---|
| US price history for all 136 catalogued materials, daily from Nov 13 and hourly from Nov 13 17:00 UTC, 2026 (min, p10, median, mean, quantity, listings) | [Forever AH API](https://forever-ah.com/api/), US house 17 "All Auction Houses" | Free, no key. Asks for ~1 request/second, caching, and credit to "Forever AH" and Blizzard's Battle.net API | One-time backfill (T0), Nov 18, 2026. Files in `data/backfill/forever-ah/`. Item IDs from its `/v1/items/search` |
| Live prices (planned, T3) | Blizzard Game Data API, `dynamic-forever-us`, ruleset 2, houses 110–125 | Blizzard API terms | House IDs as listed by Forever AH's `/v1/houses` |

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
