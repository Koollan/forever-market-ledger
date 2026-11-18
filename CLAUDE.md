# Agent notes

Read `docs/SPEC.md` first. It describes the app, its rules, data sources, assumptions and the backlog (T1–T7) with acceptance criteria.

## Ground rules
- Core features must work with **no AI calls**. Claude is optional (the Ask Claude button).
- No scraping third-party price sites. Price data comes from manual entry, the player's own addon, or the Blizzard Game Data API.
- No market-manipulation advice (buyouts, resets, cornering). Suggestions must fit the character's budget, level and reachable zones.
- Every new game datum (zones, nodes, beasts, recipe ranges) needs a source in a comment or `docs/SOURCES.md`. Mark guesses explicitly (e.g. `est: true`).
- Mobile first: check every screen at 412px wide. A past bug squeezed a title to one letter per line in a two-column row.

## Current layout
- `app/index.html`: the whole prototype in one file. Task T2 splits it into `src/data`, `src/engine` and `src/ui` with unit tests.
- `docs/SPEC.md`: spec and backlog.
- `.github/workflows/pages.yml`: publishes `app/` to GitHub Pages.

## Verifying changes
- Run the unit tests (once T2 exists).
- Take Playwright screenshots of each tab at 412×900, dark and light.
- Sanity-check the engine with three reference characters: L15 Alliance Rogue (Herbalism 90, Skinning 80), L24 Horde Hunter (Skinning 120), L42 Horde Hunter (Skinning 205). Their expected top zones today are Darkshore, The Barrens and Feralas.
