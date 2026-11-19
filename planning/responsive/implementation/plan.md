# Implementation plan: responsive layout (T8)

## Checklist

- [x] Step 1: Lock the phone (412 pixel baselines) and add the width matrix
- [x] Step 2: Wide shell: body grid, full-width header, nav rail and sidebar, content cap, toast
- [x] Step 3: Sheets as centred dialogs
- [x] Step 4: Lanes on Today and Prices
- [x] Step 5: Lanes on Farm, Professions and Session
- [x] Step 6: Hover states, docs (T8), final review

Branch `responsive/layout` from `main`, one PR. One commit per step. After every step: `npm run check` green, the behavior lock (`tests/e2e/baseline.spec.ts`) unchanged with no re-record, and the 412 pixel diff at zero. Never push or open the PR without asking. Before running Playwright locally, stop any stray `vite preview` on port 4173.

---

## Step 1: Lock the phone and add the width matrix

**Objective:** capture proof of today's 412px rendering before any layout code changes, and give every later step a screenshot matrix to review.

**Guidance:**
- Scratch spec (in the session scratchpad, not committed): seeds the L24 Horde Hunter reference via `seedFor`, fixes the clock, waits for `document.fonts.ready`, and calls `toHaveScreenshot` for each tab and for the material, characters and edit-character sheets, light and dark, at 412×900, with snapshots stored in the scratchpad. Record once on unchanged code (`--update-snapshots`); every later step re-runs it with `maxDiffPixels: 0`. Import `test` from `tests/e2e/test.ts`.
- `tests/e2e/layout.ts`: `boxes(page, selector)` (bounding boxes of matching elements) and `columnsOf(boxes)` (distinct left edges, rounded).
- `screens.spec.ts`: loop widths `[412, 768, 1280, 1920]` × light/dark × tabs, plus a sheet loop (open a material from Prices, the character chip, Edit). Keep the 412 tab tests' names and checks. Screenshots named `<name>-<width>-<scheme>.png`.

**Tests:** the matrix asserts no page errors and `scrollWidth ≤ width` at every width (passes on today's layout). One phone assertion at 412: all `main > section.card` share one left edge and `nav` sits at the bottom of the viewport.

**Integration:** extends the existing screens spec; nothing in `src/` changes.

**Demo:** `test-results/` holds today's app at four widths, the "before" picture: one 640px column with a 640px bottom bar on a 1920px screen.

## Step 2: Wide shell

**Objective:** at ≥ 720px the header spans the window, the nav becomes a left rail (tablet) or labelled sidebar (desktop), `main` scrolls beside it with content capped at 1200px, and the toast moves down.

**Guidance:** per the design's §3: `body` grid, `.app{display:contents}`, `--navw` 88px / 220px, `nav{position:static}` with a one-column `.in`, header inline subtitle and price age, `main` padding without the 96px bottom and with centring padding for the 1200px cap, toast at 24px centred over the content. All rules inside `@media (min-width:720px)` / `(min-width:1100px)`. Update the styles.css header comment.

**Tests (first):** at 768 and 1280, `nav.right ≤ main.left`, nav width ≈ 88 / 220 (±2px), header width = viewport, nav buttons stacked vertically (five distinct tops, one left). At 1920, the first card's width ≤ 1200. Clicking each nav button still switches tabs. 412 pixel diff zero.

**Integration:** tabs still render as one column inside the wider `main` until step 4; that is expected and visible in the screenshots.

**Demo:** at 1280 the app fills the window with a sidebar, header across the top and cards in the main area.

## Step 3: Sheets as centred dialogs

**Objective:** at ≥ 720px all three sheets open as centred dialogs.

**Guidance:** `.sheet{align-items:center}`, `.panel` max 560px wide, max 85vh, all corners rounded, normal bottom padding; a `pop` keyframes (fade and small scale) inside the existing reduced-motion guard, applied only at ≥ 720px so phones keep `up`. No JS changes.

**Tests (first):** at 768 and 1280, for the material, characters and edit-character sheets: panel width ≤ 560, top gap ≈ bottom gap (±2px) or panel height = 85vh with its own scroll for the tall editor; backdrop click and Escape close it. 412 pixel diff zero (sheets included).

**Integration:** uses the step 1 sheet loop for screenshots.

**Demo:** clicking a material at 1280 opens a centred card over a dimmed page.

## Step 4: Lanes on Today and Prices

**Objective:** introduce the `.lanes` / `.lane` wrappers and the column layouts for the two tabs the owner named first.

**Guidance:** a `lanes(tab, html)` helper in `views.ts`; phone rule `.lanes,.lane{display:contents}`. Today: no `.lane`, grid placement on tablet (Do this spans two rows), three columns on desktop. Prices: `.lane` around Your prices + Market; on desktop the lane becomes `display:contents` and `grid-auto-flow:column` yields 3 columns, or 2 without Market. No text, attribute or order changes inside `main`.

**Tests (first):** Today: 3 column lefts at 1280; at 768, 2 columns with Do this right of Conditions and Materials directly under Conditions. Prices with `servePrices` (US, Market present): 3 columns at 1280, 2 at 768 with Market under Your prices; without API data: 2 columns at 1280. Behavior lock unchanged, 412 pixel diff zero (this is where `display:contents` is proven).

**Integration:** the first tabs to use the wide `main` area fully.

**Demo:** Today at 1280 shows Conditions, Do this and Your materials side by side.

## Step 5: Lanes on Farm, Professions and Session

**Objective:** the remaining three tabs get their layouts, including empty states.

**Guidance:** Farm: Zones card, then a `.lane` with the profession cards; tablet lane is a 2-column grid, desktop `3fr 2fr`. Professions: auto-fit grid, columns ≥ 300px (340px in the grill; at 768 that leaves one column). Session: 760px cap on tablet, `320px 1fr` on desktop. Empty-state cards span the full width. Footnotes stay outside `.lanes`.

**Tests (first):** Farm (L15 Rogue, two gatherers): at 1280 the zones card is left of the profession cards and they stack; at 768 the zones card is full width and the two profession cards share a top. Professions: a seeded character with three professions shows 2 columns at 768 and 3 at 1280. Session: 2 columns at 1280, 1 at 768 and width ≤ 760. Empty states (a character with no professions) render one full-width card with no overflow. Behavior lock unchanged, 412 pixel diff zero.

**Integration:** every tab now uses the shared lanes helper.

**Demo:** all five tabs and three sheets at 768 and 1280–1920 in the screenshot matrix.

## Step 6: Hover, docs and final review

**Objective:** finish the wide-screen polish and record T8.

**Guidance:** `@media (min-width:720px) and (hover:hover)`: chip-coloured hover on `button.item`, zone summaries, nav buttons and `.btn` (padding/negative margin on `button.item` only inside that query so text doesn't touch the hover edge). Docs: SPEC section 2 (three layouts, "Screens" heading no longer "bottom tabs"), backlog entry **T8. Responsive layout** with acceptance criteria, ordered ahead of T4–T7 and marked done on merge; CLAUDE.md "Mobile first" bullet (check 412 / 768 / 1280+); `playwright.config.ts` comment. Review every screenshot (4 widths × 2 schemes × 5 tabs + 3 sheets) by eye.

**Tests:** hover is visual only (screenshots); everything from steps 1–5 green; `npm run check` green; 412 pixel diff zero; behavior lock unchanged.

**Integration:** the PR is ready; ask the owner before pushing and opening it.

**Demo:** the full screenshot set, light and dark, at 412 (identical to before), 768, 1280 and 1920.
