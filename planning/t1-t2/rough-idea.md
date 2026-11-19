# Rough idea: T1 and T2

Implement backlog tasks T1 and T2 from `docs/SPEC.md`.

**T1. Standalone mode**: the app runs on GitHub Pages (https://koollan.github.io/forever-market-ledger/) without claude.ai. Versioned JSON export and import of characters and prices; import replaces everything after a confirmation. The export button also ships to the claude.ai-hosted version so existing data can be carried over.

**T2. Modules and tests**: split `app/index.html` into TypeScript modules (`src/data`, `src/engine`, `src/ui`) built with Vite, unit-tested with Vitest, with Playwright screenshots at 412px. Behavior stays unchanged, verified against suggestions recorded before the split for the three reference characters at a fixed time. The engine takes an explicit `now`. Ask Claude and the claude.ai `db` storage are removed; `localStorage` is the only storage. The Pages workflow builds the static output.

## Decisions already settled (grill session, Nov 18, 2026)

| # | Decision |
|---|---|
| Q2 | Public repo `Koollan/forever-market-ledger`; Pages from GitHub Actions |
| Q4 | No sync across devices; JSON export/import only |
| Q5 | One home auction house per character (faction by default); Blackwater only as a hint. Lands after T2, not in it |
| Q6 | Single character at a time; no alt comparison |
| Q7 | Vite + Vitest + Playwright + TypeScript |
| Q8 | T2 removes Ask Claude and the claude.ai `db` storage |
| Q9 | T1's export button also goes into the claude.ai version first |
| Q10 | Export is `{"version":1,"characters":[…],"prices":[…]}`; import replaces after confirm |
| Q11 | T2 is a pure refactor: record reference suggestions first, match them after |
| Q12 | The three reference characters (`CLAUDE.md`) become permanent tests with a fixed `now` |
| Q13 | US realms |
| Q14 | One branch and PR per task; merging to `main` deploys |
