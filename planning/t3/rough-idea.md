# Rough idea: T3

Implement backlog task T3 from `docs/SPEC.md`.

**T3. Blizzard API price pipeline**: a GitHub Actions hourly cron gets an OAuth client-credentials token, reads the WoW Forever auction houses from the Blizzard Game Data API (`dynamic-forever-us`, ruleset 2, houses 110–125), reduces the listings for the 136 catalogued materials to per-item stats, and stores them as hourly and daily files. The app reads these files; manual prices remain as overrides. The T0 backfill is converted into the same format so T4 has history from Nov 13, 2026.

Acceptance (spec): after 24 h the app shows real current prices and a 24-point history for tracked materials; the conditions engine can be validated against observed weekday/weekend swings.

## Decisions from earlier sessions that apply
- US realms only (for now); track only the 136 catalogued materials; no sync across devices.
- One home auction house per character (faction by default) with a Blackwater hint.
- One branch and PR per task (T3 gets an exception, see Q17); never push or open a PR without asking.
- T4 needs 2+ weeks of T3 data: the format must make per-weekday and per-hour analysis easy.
- Core features work with no AI calls; no scraping; Booty Bay Broker is never automated.

The grill for T3 (18 decisions, Nov 18, 2026) is recorded in `idea-honing.md`.
