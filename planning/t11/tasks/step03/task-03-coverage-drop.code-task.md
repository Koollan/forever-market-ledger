# Task: Drop goods missing from the scan

## Description
The owner runs `node scripts/fetch-prices.ts --mode probe --coverage` and pastes the output. Remove every catalog item it reports missing from `src/data/goods.ts`, `data/items.json` and `items.md` (noting "dropped: not in scan"), and record the untracked count.

## Background
The owner's rule is that only items found in the API scan are listed. The probe needs the owner's Battle.net credentials, which the agent never handles.

## Reference Documentation
**Required:**
- Design: planning/t11/design/detailed-design.md (sections 2.2, 6)

**Note:** You MUST read the detailed design document before beginning implementation. Read additional references as needed for context.

## Technical Requirements
1. Remove only items listed as missing. Older catalogued materials reported missing are flagged to the owner, not removed.
2. Record the probe's house count and untracked count in `items.md` and later in `docs/SOURCES.md`.

## Dependencies
- Task 02, plus the owner's probe output

## Implementation Approach
1. Ask the owner for the output.
2. Remove the missing items, update the counts in the tests, and run `npm run check`.

## Acceptance Criteria

1. **All listed goods are in the scan**
   - Given the probe output
   - When the owner reruns it after the drop
   - Then "missing from every house read: none"

2. **Checks green**
   - Given the drop
   - When `npm run check` runs
   - Then it passes with the behavior lock unchanged

## Metadata
- **Complexity**: Low
- **Labels**: T11, data, coverage
- **Required Skills**: Reading probe output
