# Forever Market Ledger

A phone-first planner for **World of Warcraft: Forever**. For one character (class, level, faction, professions, gold budget, zone reach) it tells you:

- **Today:** market conditions that move *your* materials, and what to do about them.
- **Farm:** the best zones for you, with When / Where / Why, plus beasts, levels and spots for skinners.
- **Prices:** prices you've seen, adjusted to today's conditions, with "list now" or "hold until…".
- **Professions:** what your current skill bracket needs, and whether to farm it or buy it.
- **Session:** a 30, 60 or 120 minute plan.

Core features run on built-in rules with no AI calls.

Live at https://koollan.github.io/forever-market-ledger/. Your characters and prices stay on your device; use **Backup** in the character sheet to move them to another one.

## Develop
A static site built with Vite and TypeScript. Needs Node 24.

```bash
npm install
npm run dev        # local dev server
npm run check      # typecheck, unit tests, browser tests (builds first)
npm run build      # static site in dist/
```

- `src/data`: reference tables (zones, gathering, skin spots, consumables, professions, materials).
- `src/engine`: pure rules and suggestions; every function takes the time and data it needs.
- `src/ui`: the five tabs, sheets, storage (`localStorage`) and events; `src/main.ts` boots it.
- `tests/unit` (Vitest) and `tests/e2e` (Playwright at 412×900). `tests/baseline` locks what the app shows and computes for three reference characters; any change to it fails CI.

Pushing to `main` deploys to GitHub Pages only after every check passes.

## Status
See [`docs/SPEC.md`](docs/SPEC.md) for rules, data sources, assumptions and the backlog. Done: T0 (price history backfill), T1 (standalone mode with Backup), T2 (modules and tests). Next: T3 (Blizzard API price pipeline).
