# Summary: responsive layout (T8) planning

Planned Nov 18, 2026 with the `/pdd` workflow, after a `/grill-me` session that settled 19 decisions (all recommendations accepted; T8 goes ahead of T4–T7).

## Artifacts
- `rough-idea.md`: the request, done criteria and constraints
- `idea-honing.md`: the 19 grill questions and answers
- `research/existing-code.md`: current DOM, CSS widths, class names in use, how the behavior lock reads the page, `display:contents` and `innerText`
- `design/detailed-design.md`: standalone design
- `implementation/plan.md`: 6 steps with checklist

## Design in brief
- Three layouts: phone < 720px (unchanged), tablet 720–1099px, desktop ≥ 1100px; all new CSS behind min-width queries.
- At ≥ 720px, `body` becomes a grid and `.app` `display:contents`: full-width header, nav as an 88px rail (tablet) or 220px labelled sidebar (desktop), `main` as the only scroller with content capped at 1200px.
- Tabs use text-free `.lanes` / `.lane` wrappers (`display:contents` on phones). Today and Prices go three across on desktop, two on tablet; Farm puts zones beside the profession cards; Professions is an auto-fill grid; Session puts the picker beside the steps.
- Sheets become centred dialogs (≤ 560px, ≤ 85vh) with no JS changes.

## Implementation approach
Step 1 locks the 412px rendering with zero-tolerance pixel baselines (scratch, not committed) and adds a 4-width screenshot matrix; each following step writes its layout assertions first, then the CSS. One branch, one PR, ask before pushing.

## Next steps
1. Approve the design and plan.
2. Implement step by step with `/code-assist` (or `/tdd`), then `/code-review`, then ask before pushing.

## Areas to watch
- `display:contents` must leave `main.innerText` identical at 412; step 4 proves it with the behavior lock and the pixel diff.
- Today's tablet grouping (Conditions + Materials left) is not adjacent in the DOM, so it relies on grid placement; a very long Do this list leaves empty space under Materials, not under Conditions.
- Pixel baselines depend on Google Fonts loading; the scratch spec waits for `document.fonts.ready` and is re-recorded only on unchanged code.
