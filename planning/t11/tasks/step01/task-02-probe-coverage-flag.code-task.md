# Task: `--coverage` option for the price probe

## Description
Extend `node scripts/fetch-prices.ts --mode probe` with a `--coverage` option. It reads every house's `/commodities`, runs `coverage()` from task 01 against the catalog in `data/items.json`, and prints the catalog items missing from the scan (name and ID) plus the distinct untracked count and per-house counts. The owner runs it once before T11 merges and drops any missing item.

## Background
`probe()` in `scripts/fetch-prices.ts` currently reads a token, the ruleset and house indexes, and only the two houses in `PROBE_HOUSES`. `catalog()` gives `{ids, names}` from `data/items.json`. `tryGet` wraps `getJson` with retries, and requests are spaced about one per second. Battle.net credentials live only in repo secrets and the owner's terminal: the agent never runs this against the live API, and never asks for, prints or stores credentials. The output may contain only names, IDs and counts.

## Reference Documentation
**Required:**
- Design: planning/t11/design/detailed-design.md (sections 4.6, 6)

**Additional References (if relevant to this task):**
- planning/t11/research/existing-code.md (Probe bullet)

**Note:** You MUST read the detailed design document before beginning implementation. Read additional references as needed for context.

## Technical Requirements
1. With `--coverage`, `probe` reads the house index and then `/commodities` for every listed house, 15 house requests plus the token and index, using the existing `tryGet`, `deps` and `NS`.
2. A house with no `auctions` key counts as read with no IDs. A house whose request fails is reported as failed and left out, and the report says how many houses were read (n of N).
3. Print the missing catalog items as `name (id)`, or "none"; `untracked: <n> distinct commodity IDs`; and one line per house with tracked and untracked counts.
4. Without `--coverage`, probe output and behaviour are unchanged. `--save-fixture` keeps working.
5. Update the usage comment at the top of `scripts/fetch-prices.ts`.
6. Never log the token, headers carrying it, or credentials.

## Dependencies
- Task 01 (`src/pipeline/coverage.ts`)
- Existing `getToken`, `tryGet`, `catalog()` and the house index request in `scripts/fetch-prices.ts`

## Implementation Approach
1. Put the input shaping in a small pure helper next to `coverage()`, and unit test it first: commodities body → item ID list, with a missing `auctions` key → [].
2. Format the report lines in a pure function, `formatCoverage(result, names, read, total)`, tested in `tests/unit/coverage.test.ts`.
3. Wire both into `probe()` behind `arg("coverage")` or a flag check. Keep the script itself thin.

## Acceptance Criteria

1. **Body to IDs**
   - Given a commodities body with listings of items 1, 1 and 3
   - When the helper extracts IDs
   - Then it yields 1 and 3. Given a body with no `auctions` key, it yields none.

2. **Report shows missing names**
   - Given a coverage result with `missing: [9]` and names {9: "Chunk of Boar Meat"}
   - When the report is formatted
   - Then it includes `Chunk of Boar Meat (9)` and the untracked count

3. **Failed houses are visible**
   - Given 14 of 15 houses read
   - When the report is formatted
   - Then it says `houses read: 14/15`

4. **Probe unchanged without the option**
   - Given `--mode probe` without `--coverage`
   - When it runs
   - Then it makes the same requests and prints the same output as before

5. **Checks stay green**
   - Given the change
   - When `npm run check` runs
   - Then typecheck, unit tests and browser tests pass, and the behavior lock is unchanged

6. **Owner can run it**
   - Given the owner's own credentials in their terminal
   - When they run `node scripts/fetch-prices.ts --mode probe --coverage`
   - Then they see 0 missing for today's 136-item catalog and the distinct untracked count. The agent doesn't run this step.

## Metadata
- **Complexity**: Low
- **Labels**: T11, pipeline, probe, script
- **Required Skills**: TypeScript, Node scripts, Vitest
