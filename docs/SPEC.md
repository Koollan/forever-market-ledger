# Forever Market Ledger: Spec

A phone-first companion app for **World of Warcraft: Forever** (launched 2026-11-04). It tells one character what to farm, where, when and why, how materials prices are likely to move today, and what to buy, sell or hold. Everything is personalized to a character's class, level, faction, professions, gold budget and zone reach.

This document is the hand-off from the prototype built in chat (Nov 18, 2026) to the agent pipeline. It describes what exists, the rules and data it runs on, the assumptions to revisit, and the work ahead.

---

## 1. Goals and non-goals

**Goals**
- Personalized, actionable suggestions for a single character, readable on a phone in under a minute.
- Works with **no AI calls**. (The optional "Ask Claude" button was removed in T2.)
- Market data comes from the player's own sources: manual prices now, an in-game addon and/or the Blizzard Game Data API later.
- Realistic for the character: suggestions must fit their gold, level and reachable zones.

**Non-goals**
- Scraping third-party sites (Booty Bay Broker, Timesaver.gg). Tried and dropped: pagination, anti-bot blocks, terms risk, token cost per refresh. Booty Bay Broker's Terms of Service (v1.22, Nov 15 2026, section 4) forbid automated collection outright. A site's own documented public API used within its stated limits is not scraping (see T0).
- Market manipulation advice: no buyouts, resets or cornering supply. Flips/resells stay small.
- Per-refresh Claude calls for data.

---

## 2. Current state

A static site on GitHub Pages (https://koollan.github.io/forever-market-ledger/), built with Vite from TypeScript modules (T2, Nov 2026). It started as one ~900-line HTML file hosted as a claude.ai artifact; that file and its claude.ai features (private sync, Ask Claude) are retired.

Data stays on the device in `localStorage` (key `fml-cache`). Since T3, US characters also get hourly auction prices from the Blizzard Game Data API: the app fetches them from the repo's `prices` branch and keeps the last good copy in `fml-prices` (not part of Backup); the header shows how fresh they are. The character sheet's **Backup** section exports everything as versioned JSON and imports it all-or-nothing after a confirm (T1). There is no sync across devices (decided Nov 18, 2026).

### Layouts (T8)
Phone first. Below 720px: one column, header with the character chip, bottom tab bar, bottom sheets (checked at 412px). From 720px (tablet): full-width header, an 88px nav rail on the left, cards in two columns, sheets as centred dialogs (at most 560px wide, 85vh tall). From 1100px (desktop): a 220px labelled sidebar and up to three columns, content capped at 1200px. Today: Conditions, Do this and Your materials side by side. Farm: zones beside the profession cards. Prices: Your prices, Market and Find. Professions: a grid of cards. Session: picker beside the steps.

### Screens (tabs)
| Tab | What it shows |
|---|---|
| Today | **Conditions now** (only conditions that move this character's materials, one line each: effect + what to do), **Do this** (farm / list / hold / process / buy / train suggestions), **Your materials today** (% shift vs a normal day) |
| Farm | Ranked zones with expandable **When / Where / Why** dossiers; per-gathering-profession node lists (skill color, zones, today's shift, gold/hr if priced); **Where to skin now** for skinners |
| Prices | Manually entered prices with List now / Hold until… advice; **Market**: API prices (home faction house p10) for what the character gathers or needs, with the same advice and a "Smelt first +N%"-style tag when processing pays (T9); search to add prices for any catalogued material. The material sheet shows the active price and its source, min/median, a 24-hour line, a Blackwater hint and **Process or sell** (each recipe the character can make from it, gold kept both ways) |
| Professions | Per profession: skill bar, training-cap warnings, current bracket's materials marked **Farm it** (with zones, incl. mine-and-smelt) or **Buy** (cheapest window this week) |
| Session | 30 / 60 / 120 min plan: AH step, gathering loop with expected yield, profession skill-ups |

Character sheet (header chip): name, class, level, region (US/EU), faction, Skyborne flag, AH gold budget (blank = level-based estimate), zone reach (+0..+5 levels), profession skills.

---

## 3. Architecture

| Module | Responsibility |
|---|---|
| `src/data/classes.ts` | `CLASSES`, `PROFS`, `CONS_TAGS` |
| `src/data/gathering.ts` | `GATHER` (node → skill req), `SMELT`, `GATHER_RATE` |
| `src/data/zones.ts` | `ZONES` (level range, faction, herbs, ores, flags), `ZONE`, `STONE_OF`, `LEATHER_TIERS`, `SKIN_SPECIAL`, `KALIMDOR`, `DENSITY` |
| `src/data/consumables.ts` | `CONSUMABLES` (name, min level, class tag), `HOUSES` (AH cut: faction 5%, neutral Blackwater 15%) |
| `src/data/professions.ts` | `RANKS` (training caps), `PATHS` (crafting material brackets) |
| `src/data/skinSpots.ts` | `SKIN_SPOTS` |
| `src/data/recipes.ts` | `RECIPES` (smelting, Transmute: Arcanite, mana potions and elixirs, leather conversions), `VENDOR` reagent prices (T9) |
| `src/data/materials.ts` | `MATS` / `MAT`: 136 materials with category and tier (1–6 by level bracket); `LAUNCH` |
| `src/engine/conditions.ts` | `RULES`, `ctxAt`, `shiftAt`, `windows` (best/worst 3-hour slots over the next N hours from `now`) |
| `src/engine/estimate.ts` | `estimate` (see 4.2) |
| `src/engine/farm.ts` | budget estimate, `reachZones`, `whereGather`, zone labels |
| `src/engine/character.ts` | `canGather`, `rankBlock`, `needsFor`, skill colors, AH cut, gold per hour |
| `src/engine/skinning.ts` | `skinReq`, `skinPlan`, `skinSpots`, `skinLine` |
| `src/engine/dossier.ts` | `continentOf`, `zoneDossier` (When/Where/Why) |
| `src/engine/suggestions.ts` | `gatherOptions`, `bestFarm`, `heldNames`, `sellAdvice`, `processAdvice`, `todaySuggestions`, `sessionPlan`; each takes `{now, items, toggles}` |
| `src/engine/process.ts` | T9 process or sell: `canMake`, `routesFrom` (one or two steps), `compareRoute` (gold kept per craft after the cut, vendor reagents counted), `processOptions`, `processAdviceFrom` |
| `src/engine/backup.ts` | `buildBackup`, `validateBackup`, `backupData` (T1) |
| `src/engine/market.ts` | T3 API prices: `homeSeries`, `activePrice` (your price wins while newer than the API hour and under 24 h old), `history` (hourly p10), `blackwaterHint`, `asOf` (stale past 3 h); `estimate` takes an optional API context |
| `src/data/items.ts` | `ITEM_ID`: catalog name → item ID, from `data/items.json` |
| `src/pipeline/*` | T3 price pipeline, pure: Battle.net requests (`http`), houses and series, listings → stats (`reduce`, `series`), snapshot hours, the `prices` branch files (`files`), T0 conversion. Run by `scripts/fetch-prices.ts` (modes `probe`, `run`, `import`) |
| `src/ui/*`, `src/main.ts` | State and `localStorage`, the five tabs, sheets (material, characters, Backup), events, boot |

The engine is pure: no DOM, storage or clock. The UI reads the clock once per call and passes it in.

---

## 4. Rules

### 4.1 Conditions engine (rule-based price shifts)
Each rule: `when(ctx)` → applies; `hit(material, ctx)` → `{p: percent, why}`; `act` → what to do. Multipliers combine and clamp to 0.6–1.6.

| Rule | When | Affects | Shift |
|---|---|---|---|
| Leveling front | always | tier = front tier / +1 / −1 / ≤−2 | +12% / +6% / −4% / −12% |
| Endgame demand | day ≥ 21 | tier 6 | +10% |
| Weekend | Fri 17:00 – Sun | raw materials | −7% |
| Midweek | Tue–Thu | raw materials | +4% |
| Raid reset prep | Mon 17:00 – Tue, day ≥ 14 | consumables, tier 6 | +10% |
| Greenhouse supply | day ≥ 30 | herbs | −3% |
| Prime time (sell mode) | 18:00–23:00 | all | +3% |
| Quiet hours (buy mode) | 03:00–10:00 | all | −3% |

`frontLevel(t) = min(60, 8 + 52·(1 − e^(−days/25)))`: estimate of where most players are leveling.

### 4.2 Price estimate from manual entries
Each entry is de-conditioned: `base_i = price_i / shift(t_i)`. Base = median of `base_i`. Estimate now = `base × shift(now)`. Old prices stay useful.
Sell advice: hold if the best 3-hour window in the next 7 days beats now by > 5%, otherwise list now.

### 4.3 Farming
- Zone reachable if faction-appropriate (or contested), `zone.min ≤ level + reach`, and (Skyborne zone ⇒ Skyborne character).
- Node gatherable if `skill ≥ req` and present in a reachable zone. Skinning tiers use beast-level ranges (Light 1–27, Medium 15–36, Heavy 25–46, Thick 35–63, Rugged 43–63) and require `tier.lo ≤ level + reach`.
- Skill color (Classic): orange `< req+25`, yellow `< req+50`, green `< req+100`, grey beyond.
- Skinning skill for beast level L: `L ≤ 10 → 1`, `L ≤ 20 → (L−10)·10`, else `5·L`. Beasts considered up to `level + 3`.
- Zone score = Σ(skill-up weight·3 + log price·1.5 + today's shift) + skinning-spot bonus (orange +6 / yellow +3 / green +1; all mapped spots locked −4).
- Gold/hr guide: herbs 35 nodes × 2.3, skins 25 × 1.5, ore 20 × 2.5 per hour, after AH cut.

### 4.4 Budget and safety
- Budget = entered gold, else estimate by level (L<10: 50s, <20: 4g, <30: 20g, <40: 60g, <50: 150g, <60: 300g, 60: 600g).
- Buy suggestions stay within budget. The Claude prompt forbids manipulation and items over budget.

---

## 5. Data and sources

| Data | Source | Confidence |
|---|---|---|
| Herb skill reqs, best zones per bracket, node counts | Wowhead (Forever) via kami-labs.fr Herbalism guide (checked Oct–Nov 2026) | Good |
| Ore skill reqs, zones, node counts; Heavy Thorium (Hyjal, 300) | kami-labs.fr Mining guide (Wowhead Forever, ForeverChanges, ForeverDB); warcraft.wiki.gg "Forever mining techniques" | Good |
| Skinning mechanics same as Classic | warcraft.wiki.gg "Forever skinning techniques" | Good |
| Skinning spots (beasts, levels, subzones) | rankedboost.com Forever Skinning guide (**original-game spawns**, may differ in Forever) | Medium |
| Leather beast-level ranges | Classic data (legacy-wow) | Medium |
| New zones: Zephras Isle 1–12 (Skyborne start), Riverglades 35–45 contested, Shen'dralas 40–53 (sources conflict), Mount Hyjal 60 | warcraft.wiki.gg, icy-veins, exputer, skycoach | Good for levels; **nodes for Riverglades/Shen'dralas are guesses** (`est:true`) |
| Crafting material paths (`PATHS`) | Classic leveling routes | Medium. Forever changed some recipe ranges (e.g. Leatherworking recipes grey ~25 points earlier) |
| AH cut 5% faction / 15% neutral | conquestcapped.com (game client check, Nov 13 2026) | Good |
| Condition percentages, raid reset day, leveling-front curve | **Author's rules of thumb** | Low; calibrate with real data |

---

## 6. Assumptions to revisit
1. Raid reset is Tuesday for US realms (EU likely Wednesday; not handled).
2. Leveling-front curve (τ = 25 days) is a guess.
3. All condition percentages are heuristics.
4. Skinning/herb/ore spots are Classic spawns; Forever changed Copper, Tin, Silver, Gold and Truesilver veins and may change others.
5. Forever's new herbs (Wilted Peacebloom, Stunted Silverleaf, three endgame herbs) are not catalogued.
6. Gather rates per hour are rough.
7. Times use the device's local clock, not server time.

---

## 7. Backlog
Each task has acceptance criteria. Suggested order: T0 → T1 → T2 → T3 → T8 → T4, then data tasks in parallel.

**T0. One-time price history backfill** (done Nov 18, 2026)
- `scripts/backfill-forever-ah.mjs` pulled hourly and daily history for the catalogued materials from Forever AH's free public API (US, "All Auction Houses" view, ~1 request/second as the API asks). Raw files in `data/backfill/forever-ah/`, each tagged `source: "forever-ah"`.
- Coverage: all 136 catalogued materials; daily from Nov 13, 2026, hourly from Nov 13 17:00 UTC (126 hours to Nov 19 00:00). Nov 4–12 is not available from any source that permits collection; T4 treats launch week as missing.
- Forever renamed four catalogued elixirs (same item IDs): Lion's Strength → Elixir of Minor Strength (2454), Ogre's Strength → Elixir of Ogre Strength (3391), Giants → Elixir of Greater Strength (9206), Superior Defense → Elixir of Greater Defense (13445). Fix the catalog names in T6.
- After T3 exists, convert these files to T3's format so T4 has history from Nov 13.

**T1. Standalone mode** (GitHub Pages) (done Nov 18, 2026, PR #1)
- Hide the Ask Claude card when `window.claude` is absent.
- Export / Import characters and prices as JSON (copy/paste box; file picker as a bonus, since it is blocked inside the claude.ai viewer).
- ✅ App loads from `https://<user>.github.io/forever-market-ledger/` with no console errors; data survives reload; export → clear → import round-trips exactly.

**T2. Split into modules and add tests** (done Nov 18, 2026; design and plan in `planning/t1-t2/`)
- `src/data/*` (zones, gather, skin spots, consumables, paths), `src/engine/*` (conditions, estimate, farm, skinning, suggestions), `src/ui/*`.
- Unit tests for: `skinReq`, `skinPlan`, `whereGather`, `reachZones`, `shiftAt` (weekend/midweek/raid), `estimate` de-conditioning, `flip`/sell windows, `sessionPlan` allocation.
- Visual check: Playwright screenshots at 412px wide for every tab (regression: the "Conditions now" squeeze bug).
- ✅ Tests green in CI; built output is still a static site.

**T3. Blizzard API price pipeline** (done Nov 19, 2026: PR A #3, PR B #4; design and plan in `planning/t3/`, decisions from the grill on Nov 18, 2026)
- Two PRs: **A** (`t3/pipeline`, steps 1–5) starts hourly collection; **B** (`t3/app`, steps 6–10) makes the app use it.
- `.github/workflows/prices.yml`, hourly at :40 UTC: client-credentials token → `dynamic-forever-us`, ruleset 2 → each of the 15 houses' `/data/wow/ruleset/2/auctions/{houseId}/commodities` (materials are commodities) → per item `[min, p10, p25, median, qty, listings]`, quantity-weighted, pooled into four series: `alliance`, `horde`, `blackwater`, `all`.
- Stored on the orphan `prices` branch (not `main`): `us/latest.json`, `us/{series}/hourly/{yyyy-mm-dd}.json`, `us/{series}/daily/{yyyy-mm}.json`, columnar and tagged by source. Since T10, each house also has its own series `house-{id}` (hourly and daily files, and an entry in `latest.json`). Hourly data is kept (T4 needs per-hour effects), not rolled up after 7 days; the branch history is squashed monthly. US only for now.
- Item IDs from `data/items.json` (recorded by T0); no static item API calls.
- Secrets: `BNET_CLIENT_ID`, `BNET_CLIENT_SECRET` in repo secrets (added Nov 19, 2026).
- App (PR B) fetches the files at runtime and caches them in `fml-prices`; `p10` of the home faction's series is the price; a manual price wins while newer than the API's snapshot and under 24 h old; API prices more than 24 h old no longer drive prices or advice. Sell advice covers your priced materials plus what you gather that has an API price; farm zone values use API prices too. EU characters stay on manual prices.
- ✅ After 24h, the app shows real current prices and a 24-point history for tracked materials; conditions engine can be validated against observed weekday/weekend swings.

**T4. Calibrate the conditions engine**
- Use 2+ weeks of T3 data to fit weekday/hour/raid-reset effects per category and tier; replace hand percentages; keep the rule structure.
- ✅ Each rule's percentage cites the measured effect and sample size.

**T5. Lightweight in-game addon**
- Records the player's own AH scans (and optionally bag contents) to SavedVariables; a small export string the app can paste in.
- ✅ A scan in game becomes prices in the app with one paste.

**T6. Data completeness**
- Forever new herbs and their zones; Riverglades / Shen'dralas / Hyjal nodes and skinnable beasts (remove `est:true` when confirmed).
- Skinning spots for Redridge, Stonetalon, Duskwood, Badlands, Swamp of Sorrows, Felwood, Silithus.
- Herb and ore subzone hotspots (RankedBoost lists "most spots" per zone and bracket).
- Forever crafting recipe ranges for `PATHS`.
- First Aid healing potion recipes (Forever moved them from Alchemy; reagent counts and spice prices unconfirmed), then add them to `RECIPES`. Confirm the `est` recipe numbers in `src/data/recipes.ts`. Catalogue more crafted outputs (e.g. Stonescale Oil) so more recipes can be compared.
- ✅ Each new datum has a source in a comment or `docs/SOURCES.md`.

**T8. Responsive layout** (Nov 18, 2026; design and plan in `planning/responsive/`; done ahead of T4–T7)
- Tablet (720–1099px) and desktop (≥ 1100px) layouts as in section 2, Layouts: side nav, columns per tab, sheets as centred dialogs. CSS behind min-width media queries plus text-free `.lanes`/`.lane` wrappers (`display:contents` on phones).
- ✅ Every tab and sheet at 412px renders pixel-identical to before; the behavior lock is unchanged; screenshots at 412, 768, 1280 and 1920, light and dark; layout checks in `tests/e2e/responsive.spec.ts`.

**T9. Process or sell** (Nov 18, 2026; grill, research, design and plan in `planning/process-or-sell/`)
- For each material the character priced or gathers, compare selling it raw with selling what they can make from it (one or two steps): Mining smelting incl. Bronze, Steel and Dark Iron (level + reach ≥ 52), Transmute: Arcanite, Alchemy mana potions and elixirs, Leatherworking conversions Light → Rugged. Healing potions (First Aid in Forever) wait for T6.
- Gold kept per craft after the home cut on both sides, at the active price (API p10 or yours), vendor reagents counted. Processing is recommended at > 10% and ≥ 1s more per craft; routes for Today and Prices use only inputs the character holds (no buying to craft).
- Shown on the material sheet (all routes, including "No price for … yet"), as a Prices row pill and as a Today "Process" card (top two routes; their inputs leave the List now / Hold cards).
- ✅ Every recipe number cites a source (`est` where Forever is unconfirmed); unit tests for routes, the comparison and thresholds; `tests/e2e/process.spec.ts` at 412px; the behavior lock is unchanged.

**T10. Ruleset-aware prices** (Nov 19, 2026)
- Rulesets (Normal, PvP, Roleplay, Roleplay PvP) have entirely separate auction houses (owner, Nov 19, 2026). The faction series pool every house of a faction, so they blend several rulesets' markets; the Forever AH history before Nov 19 04:00 pools all 15 houses.
- **Step 1 (done, PR #8):** the pipeline also stores each house as its own series, `us/house-{id}/hourly|daily`.
- **Step 2 (estimated):** `src/data/rulesets.ts` maps each ruleset to one Alliance, Horde and Blackwater house. The houses come in five sets (110/113/116, 111/114/117, 112/115/118, 119/120/121, 123/124/125); 112/115/118 is empty. The busy sets are Normal and PvP and the small ones the two Roleplay rulesets (community notes, owner's listing counts), but which is which within each pair is a guess (house IDs in ruleset-size order: Normal 110, PvP 111, RP 119, RP-PvP 123), marked `est: true`. Confirm by comparing per-house listing counts with a site that labels houses, or an in-game listing, then flip `est`.
- **Step 3 (done):** a Ruleset select on the character sheet (default "Not set"), kept in Backup. With a US ruleset set, prices, history, advice and the Blackwater hint use that ruleset's houses; `latest.json` carries every house's entry. A house missing from `latest.json` (older files) or never read falls back to the pooled faction series. Characters without a ruleset are unchanged.
- ✅ A character with a ruleset sees its ruleset's prices; the behavior lock is unchanged (reference characters have no ruleset).

**T7. Server time and region**
- Use realm time zone and region-specific raid reset (US Tue / EU Wed).

---

## 8. Open questions (answered in the grill session, Nov 18, 2026)
1. Sync across devices in the standalone version? **No.** Backup export/import only; revisit if switching devices gets tedious.
2. Faction house only, or also Blackwater? **One home house per character** (faction by default), with a hint when Blackwater beats it after its 15% cut. Not built yet.
3. Should the Blizzard pipeline track all items or only the catalogued materials? **Only the catalogued materials.**
4. Addon scope? **AH scans only** first; bags/bank and node logging later.
5. Single character or compare alts? **Single character**; comparing alts waits for T3 and T5 data.
6. Keep Ask Claude? **No.** Removed in T2.
