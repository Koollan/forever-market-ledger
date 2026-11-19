# Idea honing: T1 and T2

Questions and answers that refine the rough idea, beyond the decisions already settled in `rough-idea.md`.

## Q1. Where do Export and Import live in the UI?

Options suggested:
- A "Backup" section at the bottom of the character sheet (opened from the header chip), with Export (shows a box of JSON with a Copy button) and Import (paste box, then a confirm step).
- A sixth bottom tab, "Data".
- A small menu (⋯) in the header.

**Answer:** A "Backup" section at the bottom of the character sheet. Export shows the JSON in a box with a Copy button; Import is a paste box, then a confirm step. Chosen because backups are rare, belong with saved characters, and add no navigation at 412px.

## Q2. What exactly must stay identical across the T2 refactor?

Options suggested:
- Engine outputs only: JSON snapshots of the suggestion functions (`todaySuggestions`, `bestFarm`/`gatherOptions`, `sellAdvice`, `sessionPlan`, `skinPlan`, `shiftAt`, `estimate`) for the three reference characters at several fixed times (a weekday, a weekend evening, Monday raid-reset prep).
- Engine outputs plus the visible text of every tab for those characters and times.
- Pixel screenshots compared before and after.

**Answer:** Engine outputs plus the visible text of every tab, for the three reference characters at three fixed times (a weekday, a weekend evening, Monday raid-reset prep). Most of the app's value is its words; text comparison is stable. The 412px screenshots stay for human review, not exact comparison.

## Q3. What happens to `app/index.html` and the claude.ai version after T2?

Context: T1 adds export/import to `app/index.html` itself (so it can also go to claude.ai). T2's "before" record is taken from that post-T1 file.

Options suggested:
- Delete `app/` at the end of T2 (git history keeps it); Pages serves only the Vite build; the claude.ai artifact is retired once you have exported your data.
- Keep `app/index.html` as a frozen legacy copy alongside the new build.
- Keep the claude.ai artifact updated from the new build as a second host.

**Answer:** Retire both. Delete `app/` at the end of T2 (git history keeps it) and retire the claude.ai artifact once the user has exported their data. Pages serves only the Vite build.

## Q4. How does Import handle bad input?

Options suggested:
- All or nothing: validate the whole paste first; if anything is wrong (not JSON, missing `version`, a newer `version` than the app knows, a character or price with missing or wrong-typed fields), show one plain message naming the problem and change nothing. Unknown extra fields are ignored. The confirm step shows what will be imported ("3 characters, 41 prices").
- Best effort: import the valid records, skip the bad ones, and report how many were skipped.

**Answer:** All or nothing. Validate the whole paste first; on any problem show one plain message and change nothing. Unknown extra fields are ignored; a newer `version` is refused. A valid paste shows a confirm with counts ("Replace with 3 characters and 41 prices?"). Chosen because import replaces everything, so a partial import would silently lose skipped records.

## Q5. What runs in CI, and does it gate the deploy?

Options suggested:
- A `ci` workflow on every PR and push: typecheck, Vitest, Playwright (refactor-check text comparison plus 412px screenshots uploaded as an artifact). The Pages workflow on `main` runs the same checks and deploys only if they pass.
- Tests on PRs only; `main` deploys without re-running them.
- Unit tests only in CI; Playwright run locally.

**Answer:** Gate deploys. A `ci` workflow on every PR and push runs typecheck, Vitest, and Playwright (text comparison against the "before" record, plus 412px screenshots uploaded as an artifact). The Pages workflow on `main` runs the same checks and deploys only if they pass, so even a direct push to `main` can't ship a broken build.
