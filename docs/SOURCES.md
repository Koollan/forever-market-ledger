# Sources

Every game or market datum the app uses names its source here or in a code comment. Guesses are marked `est: true`.

## Market data

| Data | Source | Terms | Notes |
|---|---|---|---|
| US price history for all 136 catalogued materials, daily from Nov 13 and hourly from Nov 13 17:00 UTC, 2026 (min, p10, median, mean, quantity, listings) | [Forever AH API](https://forever-ah.com/api/), US house 17 "All Auction Houses" | Free, no key. Asks for ~1 request/second, caching, and credit to "Forever AH" and Blizzard's Battle.net API | One-time backfill (T0), Nov 18, 2026. Files in `data/backfill/forever-ah/`. Item IDs from its `/v1/items/search`. Imported into the `prices` branch's `us/all` series (tagged `fah`, `p25` null) by the workflow's `import` mode. Gap run (T3 step 6), Nov 19, 2026, same limits: hourly Nov 19 00:00–04:00 UTC into `data/backfill/forever-ah/us-all-gap/`, overlapping the first Blizzard hour (04:00). For that hour Forever AH and our Blizzard pipeline agree within 2% on min, p10, median, quantity and listings for all 136 materials, so the switch-over has no step |
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

## Recipes (T9, process or sell)

Read Nov 18, 2026 (public guide and database pages, read by hand; nothing automated). Most Forever guides say they are based on the beta. `src/data/recipes.ts` cites each entry; full notes in `planning/process-or-sell/research/recipes.md`.

| Data | Source | Confidence |
|---|---|---|
| Smelting skills and skill-up colors; Bronze makes 2; Dark Iron takes 8 ore | [warcraft.wiki.gg: Forever mining techniques](https://warcraft.wiki.gg/wiki/Forever_mining_techniques) | Good |
| 1 ore → 1 bar, 1 + 1 bars → Bronze | Classic | `est` |
| Steel Bar takes 1 Coal; Coal costs 5s | [metabot.gg: Coal](https://metabot.gg/en/wow-forever/items/coal) (vendor data marked Classic) | Medium, `est` price |
| Dark Iron at the Black Forge, Blackrock Depths minimum level 52 | Classic | `est` |
| Transmute: Arcanite (Thorium Bar + Arcane Crystal, Alchemy 275, sold by Alchemist Pestlezugg) | [wow.gg: Forever alchemy](https://wow.gg/professions/forever/alchemy) | Good |
| Arcanite cooldown "once every 2 days" | [Wowpedia: Transmute: Arcanite](https://wowpedia.fandom.com/wiki/Transmute:_Arcanite) (48 h in Classic Era, removed in 2.4.0) | `est` for Forever |
| Mana potion and elixir skills, reagents, recipe sources | [wow.gg: Forever alchemy](https://wow.gg/professions/forever/alchemy), cross-checked with [wow-professions: Forever alchemy](https://www.wow-professions.com/forever/alchemy-leveling-guide) | Good; one potion per craft `est`; Elixir of Fortitude reagents `est` |
| Leather conversion skills (Medium 75, Heavy 125, Thick 175, Rugged 225), trainer | [warcraft.wiki.gg: Forever leatherworking patterns](https://warcraft.wiki.gg/wiki/Forever_leatherworking_patterns) | Good |
| Medium = 4 Light, Heavy = 5 Medium | Wowhead Forever spells [20648](https://www.wowhead.com/forever/spell=20648), [20649](https://www.wowhead.com/forever/spell=20649) | Good |
| Thick = 6 Heavy, Rugged = 6 Thick | Classic | `est` |
| Vial prices per unit: Empty 4c, Leaded 40c, Crystal 5s (stack of 5 ÷ 5) | outof.games Forever items [3371](https://outof.games/forever/item/3371-empty-vial/), [3372](https://outof.games/forever/item/3372-leaded-vial/), [8925](https://outof.games/forever/item/8925-crystal-vial/); stacks of 5 per [warcrafttavern](https://www.warcrafttavern.com/forever/guides/alchemy/) | Good |
| Healing potions moved to First Aid (left out: counts conflict between [kami-labs](https://kami-labs.fr/en/guide-secourisme-wow-forever/) and [wow.gg](https://wow.gg/professions/forever/first-aid)) | [icy-veins](https://www.icy-veins.com/wow-forever/news/healing-potions-now-crafted-by-first-aid-in-wow-forever/) | Out of v1 (T6) |
