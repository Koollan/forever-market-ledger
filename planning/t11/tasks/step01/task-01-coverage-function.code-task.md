# Task: Pure coverage function for the commodities scan

## Description
Add a pure `coverage()` in `src/pipeline/coverage.ts`. Given each house's commodity item IDs and the catalog's IDs, it reports which catalog IDs appear in no house, how many distinct non-catalog IDs the scan holds, and per-house tracked and untracked counts. T11 uses it to check that every new catalog item is an auction-house commodity (the owner's rule: only items found in the API scan are listed), and to learn how big a whole-scan catalog would be.

## Background
The hourly pipeline keeps only the IDs in `data/items.json`. Blizzard's `/data/wow/ruleset/2/auctions/{houseId}/commodities` (namespace `dynamic-forever-us`) returns every commodity listing as `{id, item: {id}, quantity, unit_price, time_left}`. House 112 (and probably 115 and 118) has no `auctions` key at all, and the pipeline treats that as zero listings while still counting the house as read. Pipeline files are pure, typed TypeScript with erasable syntax only and `.ts` import extensions, because `scripts/fetch-prices.ts` runs them with Node's built-in TypeScript support.

## Reference Documentation
**Required:**
- Design: planning/t11/design/detailed-design.md (sections 4.6, 6, 7)

**Additional References (if relevant to this task):**
- planning/t11/research/existing-code.md (Probe bullet)
- planning/t3/research/probe.md (commodities shape and the empty house)

**Note:** You MUST read the detailed design document before beginning implementation. Read additional references as needed for context.

## Technical Requirements
1. Export `coverage(houses: { id: number; ids: Iterable<number> }[], catalog: Set<number>)`. It returns `{ missing: number[]; untracked: number; perHouse: { id: number; tracked: number; untracked: number }[] }`.
2. `missing` lists the catalog IDs found in no house, sorted ascending.
3. `untracked` is the number of distinct IDs, across all houses, that aren't in the catalog.
4. `perHouse` counts distinct tracked and untracked IDs per house, in input order. A house with no IDs gives zeros.
5. Pure function: no I/O, no clock. Erasable TypeScript only, and passes `npm run typecheck` (strict).

## Dependencies
- Vitest (existing), with `TZ=America/New_York` set by the test script
- No new packages

## Implementation Approach
1. Write `tests/unit/coverage.test.ts` first with small hand-made fixtures. It goes red.
2. Implement `coverage()` with `Set` unions.
3. Make sure duplicate IDs within a house (many listings of one item) count once.

## Acceptance Criteria

1. **Found in one house is not missing**
   - Given catalog {1, 2} and houses A: [1, 1, 3] and B: [2]
   - When `coverage` runs
   - Then `missing` is []

2. **Absent everywhere is missing**
   - Given catalog {1, 2, 9} and the same houses
   - When `coverage` runs
   - Then `missing` is [9]

3. **Distinct untracked count across houses**
   - Given houses A: [3, 4, 4] and B: [4, 5], none in the catalog
   - When `coverage` runs
   - Then `untracked` is 3

4. **Empty house counts as read**
   - Given a house with an empty ID list, as for a response with no `auctions` key
   - When `coverage` runs
   - Then its `perHouse` entry is `{id, tracked: 0, untracked: 0}` and the other results are unaffected

5. **Checks stay green**
   - Given the new module and tests
   - When `npm run typecheck` and `npm test` run
   - Then both pass, and no existing test changes

## Metadata
- **Complexity**: Low
- **Labels**: T11, pipeline, pure function, coverage
- **Required Skills**: TypeScript, Vitest
