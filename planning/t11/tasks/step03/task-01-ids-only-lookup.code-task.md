# Task: IDs-only Forever AH lookup for the approved goods

## Description
Add `--ids-only` and `--ids <file>` to `scripts/backfill-forever-ah.mjs`, then run it once for the 109 approved names. It writes `planning/t11/research/ids.json` (name → ID or null) and makes no history requests. Resolve the misses, and record every result in `planning/t11/research/items.md`.

## Background
The script already looks up null IDs through Forever AH's `/v1/items/search` (exact name match, `KNOWN_IDS` fallback), spaced 1.1 s apart with retry on 429. The owner allowed a one-time IDs-only lookup on Nov 19, 2026 (grill Q2 and Q7). `data/items.json` must match `MATS` exactly (`tests/unit/items.test.ts`), so the lookup writes to a separate file until task 02 merges it.

## Reference Documentation
**Required:**
- Design: planning/t11/design/detailed-design.md (sections 2.3, 4.5, 6)

**Additional References (if relevant to this task):**
- planning/t11/research/items.md (the approved names)

**Note:** You MUST read the detailed design document before beginning implementation. Read additional references as needed for context.

## Technical Requirements
1. `--ids <file>` picks the name → ID file to read and update, defaulting to `data/items.json` so the T0 behaviour is unchanged.
2. `--ids-only` stops after the lookup: no history requests, no files under `--out`.
3. For a name with no exact hit, log up to three of the search's own hits (name and ID). That needs no extra request.
4. Keep the existing pacing (≥ 1.1 s per request) and retries. One run only, plus reruns that skip names already found.

## Dependencies
- Step 2's approved list
- Network access to forever-ah.com

## Implementation Approach
1. Edit the script. Its behaviour without the new flags must not change.
2. Build `ids.json` from the approved names (all null) and run with `--ids-only --ids planning/t11/research/ids.json`.
3. For misses, pick a hit only if it is clearly the same item, such as a spelling variant. Otherwise drop the item, and note it in `items.md`.

## Acceptance Criteria

1. **No history fetched**
   - Given `--ids-only`
   - When the script runs
   - Then it makes only `/items/search` requests and writes nothing under `data/backfill/`

2. **Default unchanged**
   - Given no new flags
   - When the script is read
   - Then the names, the ids file and history behaviour are as before

3. **Every name accounted for**
   - Given the run is finished
   - When `items.md` is read
   - Then each of the 109 names has an ID, a "resolved as <name>" note, or "dropped: no ID"

## Metadata
- **Complexity**: Low
- **Labels**: T11, data, lookup, script
- **Required Skills**: Node scripts
