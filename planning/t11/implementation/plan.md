# Implementation plan: T11, wider catalog

## Checklist

- [x] Step 1: Coverage report in the probe
- [x] Step 2: Draft the item list (owner review)
- [ ] Step 3: Look up IDs and add the goods to the catalog
- [ ] Step 4: Cooking and Fishing relevance
- [ ] Step 5: Docs and ship

All work is on branch `t11/wider-catalog`, in one PR, with one commit per step. `npm run check` stays green after every step, and the behavior lock (`tests/e2e/baseline.spec.ts`) is unchanged throughout. If it changes, stop and tell the owner why. Never push or open a PR without asking.

---

## Step 1: Coverage report in the probe

**Objective:** a pure `coverage()` in `src/pipeline/coverage.ts` and `--mode probe --coverage` in `scripts/fetch-prices.ts`, as in design 4.6.

**Guidance:** reuse the existing house index and `/commodities` requests and the missing-`auctions`-key handling. Print only names, IDs and counts. Erasable TypeScript syntax with `.ts` imports, like the other pipeline files.

**Tests (first):** `tests/unit/coverage.test.ts`:
- a catalog ID found in one house only is not missing
- an ID found in no house is missing
- untracked = distinct non-catalog IDs across houses
- an empty house (no `auctions` key) counts as read, with zero listings

**Integration:** the probe calls `coverage()`; nothing in the app changes.

**Demo:** the owner runs `node scripts/fetch-prices.ts --mode probe --coverage` on today's catalog and sees 0 missing plus the number of distinct untracked commodities. That number answers how large a "whole scan" catalog would be.

## Step 2: Draft the item list (owner review)

**Objective:** `planning/t11/research/items.md` with about 100 goods (name, category, tier, `profs`, source and `est`), read by hand from Wowhead Forever and Forever guides. No code.

**Guidance:** cover Cooking meats, eggs and raw fish (Chunk of Boar Meat included), elementals and essences, mining gems, and oils and similar drop trade goods. Leave out vendor-only goods. Use Forever's names. Group by category with one source per group where possible, and mark tier guesses `est`.

**Tests:** none (research only).

**Integration:** the list is the input to step 3.

**Demo:** the owner reviews the list and approves it, possibly with edits. Stop here until the owner approves.

## Step 3: Look up IDs and add the goods to the catalog

**Objective:** the approved items in `src/data/goods.ts` and `data/items.json`, `MATS` including them, and `RAW` gaining Meat, Fish and Egg (design 4.1, 4.2, 4.5).

**Guidance:**
1. Add `--ids-only` to `scripts/backfill-forever-ah.mjs`.
2. Add the approved names to `data/items.json` with null IDs, then run the script. This is the one-time Forever AH lookup the owner approved on Nov 19, 2026, at about 1 request/second.
3. Fill gaps from hand-read Wowhead Forever pages, or drop the item.
4. Ask the owner to run the step 1 coverage probe and paste the output. Drop any item it reports missing, and note the drop in `items.md`.

**Tests (first):**
- `tests/unit/goods.test.ts` covering the rules in design section 7.
- `data.test.ts` and `items.test.ts` count `136 + GOODS.length`.
- `conditions.test.ts`: a Meat item gets the weekend −7%; an Elemental does not.
- `tests/e2e/catalog.spec.ts`: searching "boar" in Prices lists Chunk of Boar Meat as "Meat · tier 1"; opening it shows the material sheet; with the price fixture extended for its ID, the sheet shows the API price.

**Integration:** search, the material sheet, manual prices and API prices work for the new items through the existing code paths. Run the behavior lock and confirm it is unchanged.

**Demo:** in the built app, search "boar", open Chunk of Boar Meat and add a price. After the merge, the next hourly run prices it.

## Step 4: Cooking and Fishing relevance

**Objective:** `profGoods(c)` in `src/engine/character.ts`, added to the `relevant` set in `vPrices` (design 4.3, 4.4).

**Tests (first):**
- unit: Fishing gives Fish only; Cooking gives Meat, Egg and Fish; the three reference characters get none.
- e2e (`catalog.spec.ts`): a character with Cooking sees a meat in "Relevant to you" without searching, and in Market when the fixture prices it.

**Integration:** `vMarket` uses the same `relevant` set, with no markup change. Check the Prices tab at 412, 768 and 1280 in the `npm run check` screenshots. The behavior lock must stay unchanged.

**Demo:** set a character's professions to include Cooking, and the Prices tab lists meats and fish under "Relevant to you".

## Step 5: Docs and ship

**Objective:** the docs match the code.

**Guidance:**
- `docs/SPEC.md`: T11 in the backlog with ✅ criteria; §2 Prices row; §3 table (`goods.ts`, `coverage.ts`); §8 Q3 "Only the catalogued materials (catalog widened in T11)"; replace "136" where it describes the current catalog.
- `docs/SOURCES.md`:
  - the T11 Forever AH lookup (date, IDs only, limits)
  - the Wowhead pages used
  - the goods' category and tier sources
  - the coverage check result
- `CLAUDE.md`: mention `goods.ts` and the coverage probe in Current layout.

**Tests:** `npm run check` green; the behavior lock unchanged.

**Integration:** ask the owner before pushing and opening the PR, with the coverage output in the PR body.

**Demo:** the PR's description shows search and relevance screenshots at 412px.
