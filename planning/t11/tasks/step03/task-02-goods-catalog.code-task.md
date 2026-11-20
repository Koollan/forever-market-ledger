# Task: Goods in the catalog

## Description
Add `src/data/goods.ts` (`GOODS`) with the approved items that have IDs. Append them to `MATS`, add Meat, Fish and Egg to `RAW`, and merge their IDs into `data/items.json`, so the new goods are searchable and priced.

## Background
`MATS` is built in `src/data/materials.ts`, and `RAW` drives the weekend and midweek rules in `src/engine/conditions.ts`. Search (`vPrices`) and the material sheet work for any `MATS` name. `tests/unit/data.test.ts` asserts 136 materials, and `tests/unit/items.test.ts` asserts that `items.json` equals `MATS`. E2E specs import `test` from `tests/e2e/test.ts`, and `servePrices` serves `tests/fixtures/prices/`.

## Reference Documentation
**Required:**
- Design: planning/t11/design/detailed-design.md (sections 4.1, 4.2, 5, 7)

**Additional References (if relevant to this task):**
- planning/t11/research/items.md, planning/t11/research/ids.json

**Note:** You MUST read the detailed design document before beginning implementation. Read additional references as needed for context.

## Technical Requirements
1. `Good` and `GoodCat` as in design section 5. One source comment per group, using the source keys in `items.md` with their URLs, and `est: true` on every tier set by proxy or from Classic.
2. `Material` gains `profs?`. Each `GOODS` entry becomes a `MATS` entry with `cat`, `tier` and `profs`.
3. `RAW` adds Meat, Fish and Egg. `CONSUME` is unchanged.
4. `data/items.json` gains the IDs, and its `_source` mentions the T11 lookup.
5. The behavior lock stays unchanged.

## Dependencies
- Task 01's `ids.json`

## Implementation Approach
1. Test first: `tests/unit/goods.test.ts` covers unique names, no clash with the other materials, tier 1–6, a valid cat, and `profs` only on Meat, Egg and Fish. Update the counts in `data.test.ts`. Add to `conditions.test.ts` that a Meat item gets −7% on a weekend and an Elemental doesn't.
2. Implement until green.
3. E2E `tests/e2e/catalog.spec.ts`: searching "boar" lists Chunk of Boar Meat as "Meat · tier 1". Opening it shows the sheet, and with a price fixture for its ID the sheet shows an API price.

## Acceptance Criteria

1. **Searchable**
   - Given the built app
   - When the user types "boar" in Find a material
   - Then Chunk of Boar Meat is listed as "Meat · tier 1"

2. **Raw rules apply**
   - Given a Saturday moment
   - When `shiftAt` runs for Chunk of Boar Meat and for Elemental Fire
   - Then the weekend −7% applies to the meat only

3. **Catalog consistent**
   - Given the unit tests
   - When they run
   - Then `items.json` equals `MATS` and the count is 136 + `GOODS.length`

4. **Lock unchanged**
   - Given `npm run check`
   - When it runs
   - Then everything passes, including `baseline.spec.ts` with no re-record

## Metadata
- **Complexity**: Medium
- **Labels**: T11, data, catalog, conditions
- **Required Skills**: TypeScript, Vitest, Playwright
