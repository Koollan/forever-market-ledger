# Summary: T3 planning

Planned Nov 18, 2026 with the `/pdd` workflow, after a `/grill-me` session that settled 18 decisions (all recommendations accepted).

## Artifacts
- `rough-idea.md`: the task, acceptance criteria and earlier decisions that apply
- `idea-honing.md`: the 18 grill questions and answers, and three facts left for the probe
- `research/blizzard-api.md`: endpoints, namespaces, auth, rate limits, house IDs by faction, GitHub Actions facts, with sources
- `research/existing-data.md`: the T0 file shape, the app's price code, test and CI setup
- `design/detailed-design.md`: standalone design
- `implementation/plan.md`: 10 steps with checklist (all done)
- `handoff.md`: where things stand after T3 shipped, how to run it, what comes next

## Design in brief
- An hourly GitHub Actions job (`prices.yml`, minute :40) reads all 15 US houses (`dynamic-forever-us`, ruleset 2), keeps the 136 catalogued materials, and stores `min, p10, p25, median, qty, listings` for four series: Alliance, Horde, Blackwater, All.
- Data lives on an orphan `prices` branch: `us/latest.json`, hourly files per UTC day and daily files per month, columnar and tagged by source. History is squashed monthly.
- The app fetches from `raw.githubusercontent.com` at runtime, caches in `fml-prices`, uses the home faction's `p10` unless a manual entry is newer and under 24 h old, and shows a 24-point sparkline, a Blackwater hint and a stale label.
- The T0 backfill and a gap run are converted into `us/all`, so T4 has data from Nov 13.

## Implementation approach
Two PRs: steps 1–5 (`t3/pipeline`) start collection as early as possible; steps 6–10 (`t3/app`) make the app use it. The behavior lock stays byte-identical with the price fetch stubbed empty.

## Next steps
1. Generate code tasks with `/code-task-generator` from `implementation/plan.md`, or start step 1 with `/code-assist` or `/tdd`.
2. At step 1, create the Battle.net client and the two repository secrets (instructions in the plan), and run the probe in your own terminal.

## Areas to watch
- The Forever API is undocumented; the probe may change the commodities path or the snapshot-time source.
- Forever AH and Blizzard rows may differ for the same hour (unknown percentile method); T4 should check for a step at the switch-over.
- `raw.githubusercontent.com` is not a guaranteed CDN; the app must keep working from its cache or with manual prices only.
- Day files are rewritten hourly; the monthly squash keeps the branch size near the file size (about 12 MB a month).
