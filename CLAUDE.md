# Agent notes

Read `docs/SPEC.md` first. It describes the app, its rules, data sources, assumptions and the backlog (T1–T7) with acceptance criteria.

## Ground rules
- Core features must work with **no AI calls**. The app makes none (Ask Claude was removed in T2).
- No scraping third-party price sites. Price data comes from manual entry, the player's own addon, or the Blizzard Game Data API. Booty Bay Broker's terms forbid automated collection: never script or browser-automate it. The one exception was T0, a one-time backfill through Forever AH's documented public API within its stated limits (see `docs/SOURCES.md`); ask before using any other site's API.
- No market-manipulation advice (buyouts, resets, cornering). Suggestions must fit the character's budget, level and reachable zones.
- Every new game datum (zones, nodes, beasts, recipe ranges) needs a source in a comment or `docs/SOURCES.md`. Mark guesses explicitly (e.g. `est: true`).
- Mobile first: check every screen at 412px wide. A past bug squeezed a title to one letter per line in a two-column row.

## Current layout
- `src/data`: reference tables, typed. `src/engine`: pure rules and suggestions; functions take `now` and the data they need, never `Date.now()` or app state. `src/ui`: tabs, sheets, `localStorage` storage (key `fml-cache`), events. `src/main.ts`: boot.
- `tests/unit` (Vitest, `TZ=America/New_York`), `tests/e2e` (Playwright against the production build at 412×900, New York time); e2e specs import `test` from `tests/e2e/test.ts`, which 404s the app's price fetch so no test touches the network (`servePrices` serves `tests/fixtures/prices/` instead), `tests/baseline` (the behavior lock), `tests/fixtures/reference.ts` (reference characters, moments, prices).
- `docs/SPEC.md`: spec and backlog. `docs/SOURCES.md`: data sources. `planning/`: design and plans.
- `src/pipeline`: the T3 price pipeline, pure and typed; run by `scripts/fetch-prices.ts` (Node's built-in TypeScript support, so pipeline files use erasable syntax and `.ts` import extensions). `data/items.json`: the catalogued materials' item IDs.
- `.github/workflows/ci.yml`: checks on PRs and branches. `.github/workflows/pages.yml`: the same checks on `main`, then deploys `dist/`. `.github/workflows/prices.yml`: hourly prices into the orphan `prices` branch, the only workflow with write access. Never commit to `prices` by hand.
- Battle.net credentials live only in repo secrets and the owner's own terminal. Never ask for, print or store them. To test against the live API, the owner runs `node scripts/fetch-prices.ts --mode probe` (or `run --dry`) themselves.
- TypeScript: `tsconfig.json` is strict (engine, data, tests); `tsconfig.ui.json` allows implicit `any` in the UI's template code. `npm run typecheck` runs both.

## Verifying changes
- `npm run check`: typecheck, unit tests, then browser tests against a fresh build (screenshots of each tab at 412×900, light and dark, land in `test-results/`).
- The behavior lock (`tests/e2e/baseline.spec.ts`) compares every tab's text and the engine outputs for three reference characters at three fixed moments with `tests/baseline/*.json`. A refactor must keep it green. A deliberate change to rules or wording updates the baseline in the same commit: `RECORD_BASELINE=1 npx playwright test tests/e2e/baseline.spec.ts`, and say why in the commit.
- Reference characters: L15 Alliance Rogue (Herbalism 90, Skinning 80), L24 Horde Hunter (Skinning 120), L42 Horde Hunter (Skinning 205). Their weekday top zones are Darkshore, The Barrens and Feralas (tested).
- Locally, Playwright reuses a server already on port 4173; stop any stray `vite preview` first or it may test an old build.
