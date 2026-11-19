# Implementation plan: T8, process or sell

## Checklist

- [ ] Step 1: Recipe and vendor data with sources
- [ ] Step 2: Compare one recipe (engine)
- [ ] Step 3: Two-step routes and per-character advice (engine)
- [ ] Step 4: "Process or sell" on the material sheet
- [ ] Step 5: Process tags on Prices rows
- [ ] Step 6: Process card on Today; docs; ship

All steps are on branch `t8/process-or-sell`, one PR. One commit per step. `npm run check` stays green after every step, and the behavior lock (`tests/e2e/baseline.spec.ts`) is unchanged throughout. If it changes, stop and tell the owner why. Never push or open a PR without asking.

---

## Step 1: Recipe and vendor data with sources

**Objective:** `src/data/recipes.ts` with `RECIPES` and `VENDOR` as in the design's data models, each entry citing its source, `est: true` where Forever isn't confirmed.

**Guidance:** use catalog names for outputs and inputs, including the pre-Forever elixir names, with a comment mapping them to the Forever names. Leave out healing potions and Elixir of Superior Defense, with comments saying why. Add a "Recipes" table to `docs/SOURCES.md`.

**Tests (first):** `tests/unit/recipes.test.ts`:
- every `out` and `ins` name is in `MAT` and `ITEM_ID`, and every vendor name is in `VENDOR`
- `skill` and `colors` are ascending, and `n ≥ 1`
- every entry has a non-empty `src`
- every `SMELT` bar has a Mining recipe
- the spot values from research hold: Bronze `n = 2`, Dark Iron takes 8 ore, Medium takes 4 Light

**Integration:** data only; nothing reads it yet.

**Demo:** the test run lists the recipe checks passing, and the SOURCES table renders.

## Step 2: Compare one recipe (engine)

**Objective:** `src/engine/process.ts` with `canMake` and `compareRoute` for one-step routes (a route built from a single recipe).

**Guidance:** prices come from `estimate(..., apiCtx)` and the cut from `cutFor(houseOf(c))`. Apply the threshold from the design (> 10% and ≥ 100 copper). Notes cover the recipe source, where, cooldown and skill-ups. Take `now` from the context; no clock.

**Tests (first):**
- skill and profession gates, and Dark Iron's level + reach gate
- hand-computed values for Copper Ore → Copper Bar and for an elixir with a Leaded Vial
- just under and just over each threshold
- a missing input price and a missing output price give `"unpriced"` with `missing`
- manual-only prices (EU character)

**Integration:** uses the existing estimate and character helpers.

**Demo:** a unit test prints the Copper Bar comparison for a fixture market.

## Step 3: Two-step routes and per-character advice (engine)

**Objective:** `routesFrom`, `processOptions` and `processAdvice`, plus a `heldNames(c, x)` helper pulled out of `sellAdvice`. `sellAdvice` output must not change.

**Guidance:**
- Expand inputs one level, merge counts, and deduplicate routes.
- `processAdvice` keeps the best `"process"` route per held name, using only routes whose inputs are all held, and sorts by `diff`.
- Memoize per context the way `gatherOptions` does.

**Tests (first):**
- the routes listed in the design (Bronze, Steel, Medium/Heavy Leather, Arcanite via Thorium Bar), with no depth-3 route
- Q14 strictness: an Alchemist without Mining and without priced Arcane Crystal gets no Arcanite
- best route chosen and sorted
- the existing `suggestions.test.ts` and `suggestions-market.test.ts` stay green

**Integration:** `sellAdvice` uses `heldNames`.

**Demo:** a unit test shows a Mining character's advice list from a fixture market.

## Step 4: "Process or sell" on the material sheet

**Objective:** the section in `sheetMat`, built from `processOptions(name)`, with the row texts from the design.

**Tests (first):** `tests/e2e/process.spec.ts` at 412×900:
- set up a Mining 150 / Alchemy 150 character and fixture prices served by `servePrices` (new fixture in `tests/fixtures/prices/`)
- the Copper Ore sheet shows the Bronze row with gold values
- an unpriced route shows "No price for … yet"
- a screenshot is taken in light and dark

**Integration:** the sheet reads the engine; no state changes.

**Demo:** open Copper Ore in the app and see the section.

## Step 5: Process tags on Prices rows

**Objective:** a `${verb} first +N%` pill on Your prices and Market rows from `processAdvice`.

**Tests (first):** extend `process.spec.ts`: the Copper Ore Market row shows "Smelt first", and a material without a winning route shows no pill. `market-list.spec.ts` stays green.

**Integration:** `vPrices` and `vMarket` take the advice map next to `sa`.

**Demo:** the Prices tab shows the pill.

## Step 6: Process card on Today; docs; ship

**Objective:** the "Process" card in `todaySuggestions` (top 2 routes) and `KIND_PILL.Process`. Add **T8** to `docs/SPEC.md` with acceptance criteria, and update the architecture table. Add "First Aid potion recipes" and "rename the four elixirs" to T6.

**Tests (first):**
- unit: the card appears with a fixture market and is absent for the three reference characters
- e2e: Today shows the card at 412 px without squeezing
- the behavior lock stays unchanged

**Integration:** full feature; `npm run check` green.

**Demo:** the Mining/Alchemy test character's Today tab, Prices tab and Copper Ore sheet all agree. Then ask the owner before pushing and opening the PR.
