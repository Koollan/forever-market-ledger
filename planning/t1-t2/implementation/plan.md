# Implementation plan: T1 and T2

## Checklist

- [x] Step 1: Backup build and validate, tested (T1)
- [x] Step 2: Export in the character sheet; hide Ask Claude outside claude.ai (T1)
- [x] Step 3: Import with confirm and replace; ship T1 (T1)
- [x] Step 4: Project tooling and CI around the unchanged app (T2)
- [x] Step 5: Record and lock the baseline (T2)
- [x] Step 6: Serve the app from a Vite build of the legacy script (T2)
- [x] Step 7: Move the data tables into `src/data` (T2)
- [x] Step 8: Pure conditions and estimate engine (T2)
- [ ] Step 9: Pure farm, skinning, dossier and character engine (T2)
- [ ] Step 10: Pure suggestions and session plan; reference-character test (T2)
- [ ] Step 11: Typed UI, local-only storage, backup moved to the engine (T2)
- [ ] Step 12: Gated deploy from the build; retire the single file (T2)

Steps 1–3 are one branch and PR (`t1/standalone`); merging it deploys T1. Steps 4–12 are one branch (`t2/modules`), with a commit per step; the PR merges when step 12 is green. After every step from 6 on, the behavior lock from step 5 must stay green: that is what makes each step demoable and safe.

---

## Step 1: Backup build and validate, tested (T1)

**Objective:** add `buildBackup(state, items, now)` and `validateBackup(text)` to the single file, as pure functions with no DOM or storage access.

**Guidance:** follow the version 1 format and validation rules in the design. Return `{ok, backup, counts}` or `{ok: false, error}` with the user-facing messages from the design's error table. Write the tests first: a small `node:test` file that loads the script's functions with `node:vm` (the same approach the T0 backfill script uses to read the materials catalog).

**Tests:** round trip (build → stringify → validate gives the same backup); one failing case per validation rule; unknown fields ignored; `version: 2` refused; truncated JSON refused.

**Integration:** new functions only; nothing calls them yet, so the app is unchanged.

**Demo:** `node --test` passes; pasting a sample backup into a Node REPL call shows the counts and the error messages.

## Step 2: Export in the character sheet; hide Ask Claude outside claude.ai (T1)

**Objective:** a Backup section at the bottom of the character sheet with Export (read-only JSON box + Copy). The Ask Claude card is not rendered when `window.claude` is absent.

**Guidance:** Copy uses the clipboard API; on refusal, select the text and show the fallback message. Keep the section's layout single-column at 412px.

**Tests:** extend the Node test to check the exported text validates (step 1). Manual: Copy works on Pages; in a page where the clipboard is blocked, the text gets selected.

**Integration:** uses `buildBackup` from step 1 with the in-memory state.

**Demo:** on the local file or a Pages preview, open the character sheet, Export, paste the copied text into a text editor and see the characters and prices; the Today tab no longer shows the Ask Claude card.

## Step 3: Import with confirm and replace; ship T1 (T1)

**Objective:** Import paste box → validate → confirm card with counts → replace everything.

**Guidance:** `applyBackup` writes `S.state`, `S.items` and browser storage; inside claude.ai it also writes the `state` document and each price document, and deletes price documents not in the backup. Errors from validation appear inline and change nothing.

**Tests:** Node test for the replace logic on plain objects (old prices not in the backup are gone; `activeId` restored). Manual acceptance on Pages: no console errors; reload keeps data; export → clear site data → import round-trips exactly.

**Integration:** completes T1. Open the PR, merge, and confirm the Pages deploy.

**Demo:** paste the built file into the claude.ai artifact, export your real data there, import it on Pages, and see the same characters and prices. This is the data carry-over the retirement in step 12 depends on.

## Step 4: Project tooling and CI around the unchanged app (T2)

**Objective:** add `package.json`, TypeScript, Vite, Vitest and Playwright, and a `ci.yml` workflow, without changing the app.

**Guidance:** Vitest sets `TZ=America/New_York` before modules load. Playwright uses Chromium, viewport 412×900, `timezoneId: "America/New_York"`. The first Playwright spec takes light and dark screenshots of every tab of `app/index.html` served statically, and CI uploads them. Move the step 1–3 Node tests into Vitest.

**Tests:** the moved backup tests pass in Vitest; the screenshot spec runs.

**Integration:** the Pages workflow still deploys `app/` as before.

**Demo:** a PR shows a green `ci` run with a screenshots artifact of all five tabs.

## Step 5: Record and lock the baseline (T2)

**Objective:** commit the "before" record and a comparison that enforces it.

**Guidance:** add the fixtures from the design (three characters, three fixed New York times, a small price set). The record spec seeds `fml-cache`, fixes the clock with `page.clock.setFixedTime`, and for each character × time captures every tab's visible text and the engine outputs (evaluated in the page). It writes `tests/baseline/*.json`, run once against the post-T1 single file. The compare spec runs the same capture and requires exact equality.

**Tests:** the compare spec passes against the single file itself; editing one word in a copy of the file makes it fail with a readable diff.

**Integration:** CI runs the compare spec on every PR from here on.

**Demo:** the committed baseline files show, for example, Darkshore, The Barrens and Feralas as the top zones, and the CI run is green.

## Step 6: Serve the app from a Vite build of the legacy script (T2)

**Objective:** the same app, but built by Vite: `index.html` at the project root, CSS in `src/styles.css`, and the script moved unchanged into `src/legacy.ts` (type checking off for that file), loaded from `src/main.ts`.

**Guidance:** `base: "/forever-market-ledger/"`. Point the compare and screenshot specs at the built `dist/` served locally.

**Tests:** the compare spec passes against the build.

**Integration:** from now on every step edits `src/` and the lock checks the build. Pages still deploys `app/` until step 12.

**Demo:** `npm run build && npm run preview` serves the app; the compare spec is green against it.

## Step 7: Move the data tables into `src/data` (T2)

**Objective:** zones, gather tables, stones, leather tiers, skin specials and spots, density, consumables, houses, ranks, paths, smelting, gather rates, launch date and the materials catalog become typed modules imported by `src/legacy.ts`.

**Guidance:** types from the design's data model; no value changes. Mark guesses `est: true` as they are already.

**Tests:** a unit test that the catalog still has 136 materials and that each zone's level range is valid; the compare spec passes.

**Integration:** `src/legacy.ts` imports the tables instead of defining them.

**Demo:** the app looks and reads the same; the data is now browsable as typed files.

## Step 8: Pure conditions and estimate engine (T2)

**Objective:** `src/engine/util.ts`, `conditions.ts` and `estimate.ts`, with `now`, `items` and `toggles` passed in.

**Guidance:** `windows(..., now)` and `estimate(name, items, toggles, when)`. `money` moves to `src/ui/format.ts`. Update the legacy call sites to pass `Date.now()` once per render.

**Tests (first):** each condition rule (weekend from Friday 17:00, midweek, raid prep Monday 17:00 from day 14, prime time, quiet hours, endgame from day 21, clamp 0.6–1.6); `estimate` de-conditioning (a price entered on a weekend yields a higher weekday estimate); sell windows hold vs list at the 5% threshold.

**Integration:** legacy UI calls the new modules; compare spec passes.

**Demo:** `npm test` shows the rule cases; the app is unchanged.

## Step 9: Pure farm, skinning, dossier and character engine (T2)

**Objective:** `farm.ts`, `skinning.ts`, `dossier.ts`, `character.ts`, taking `character`, `now`, `items` and `toggles` as arguments.

**Tests (first):** `skinReq` at levels 10, 11, 20, 21, 60; `skinPlan` tiers for the reference hunters; `whereGather` and `reachZones` for faction, contested, reach and Skyborne; `canGather` thresholds; skill colours at req+25/+50/+100.

**Integration:** legacy UI calls the new modules; compare spec passes.

**Demo:** the Farm tab dossiers read the same; tests document the skinning formulas.

## Step 10: Pure suggestions and session plan; reference-character test (T2)

**Objective:** `suggestions.ts` with `gatherOptions`, `bestFarm`, `sellAdvice`, `needsFor`, `todaySuggestions`, `sessionPlan`.

**Tests (first):** the permanent reference-character test (top zones Darkshore, The Barrens, Feralas at the weekday fixed time); `sessionPlan` allocates 30/60/120 minutes fully; buy suggestions stay within budget.

**Integration:** after this step `src/legacy.ts` holds only UI code; compare spec passes.

**Demo:** `npm test` shows the reference characters' top zones; the Today and Session tabs read the same.

## Step 11: Typed UI, local-only storage, backup moved to the engine (T2)

**Objective:** split the remaining UI into `src/ui/state.ts`, `format.ts`, `views/*`, `sheets/*`, `actions.ts`, and boot in `src/main.ts`. Remove the claude.ai database code and Ask Claude entirely. `buildBackup`/`validateBackup` move to `src/engine/backup.ts`. Delete `src/legacy.ts`.

**Guidance:** storage reads and writes only `fml-cache`; existing stored data keeps loading. Type checking now covers every file.

**Tests:** backup tests run against `src/engine/backup.ts`; a Playwright test that existing `fml-cache` data from the single file loads; compare spec and screenshots pass.

**Integration:** the whole app is now typed modules.

**Demo:** the built app with seeded data matches the baseline; the Backup section still round-trips.

## Step 12: Gated deploy from the build; retire the single file (T2)

**Objective:** `pages.yml` runs typecheck, Vitest and Playwright, then deploys `dist/`. Delete `app/`. Update `README.md`, `CLAUDE.md` and the spec's layout notes.

**Tests:** the full CI suite is green on the PR; after merge, the Pages deploy runs the checks before deploying.

**Integration:** completes T2. Merge the PR.

**Demo:** the live site is served from the Vite build, loads your imported data, and the deploy log shows the checks ran first. Retire the claude.ai artifact once you've confirmed your data is on Pages.
