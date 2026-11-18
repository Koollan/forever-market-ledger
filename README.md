# Forever Market Ledger

A phone-first planner for **World of Warcraft: Forever**. For one character (class, level, faction, professions, gold budget, zone reach) it tells you:

- **Today:** market conditions that move *your* materials, and what to do about them.
- **Farm:** the best zones for you, with When / Where / Why, plus beasts, levels and spots for skinners.
- **Prices:** prices you've seen, adjusted to today's conditions, with "list now" or "hold until…".
- **Professions:** what your current skill bracket needs, and whether to farm it or buy it.
- **Session:** a 30, 60 or 120 minute plan.

Core features run on built-in rules with no AI calls.

## Run it
It's a static site: open `app/index.html` in a browser, or enable GitHub Pages (the included workflow publishes `app/`).

## Status
Prototype built Nov 2026. See [`docs/SPEC.md`](docs/SPEC.md) for rules, data sources, assumptions and the backlog (standalone mode, module split and tests, Blizzard API price pipeline, in-game addon).
