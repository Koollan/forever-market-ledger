# Idea honing: responsive layout

Settled in a `/grill-me` session on Nov 18, 2026, in three rounds. Every recommendation was accepted ("yes to all"); one addition on Q19.

## Round 1: the shell

**Q1. Breakpoints.** Three layouts: phone < 720px (today's, untouched), tablet 720–1099px, desktop ≥ 1100px. All wide-screen CSS lives inside `@media (min-width:720px)` blocks so the phone rules never change.
**A:** Yes.

**Q2. Navigation.** (a) left rail on tablet (~88px, icon over label), labelled sidebar on desktop (~220px, icon beside label); (b) top tab bar; (c) wider bottom bar.
**A:** (a). Same `<nav>` and `data-tab` buttons, restyled.

**Q3. Header.** (a) full-width top bar above nav and content: brand left, subtitle and price age inline, character chip right; (b) brand moves into the desktop sidebar.
**A:** (a), CSS only.

**Q4. Content width at 1920px.** (a) capped at ~1200px, centred in the space right of the nav; (b) uncapped.
**A:** (a).

**Q5. Sheets.** (a) all sheets become centred dialogs (~560px, rounded, max 85vh, own scroll, fade/scale); (b) material sheet as a right side panel, others dialogs; (c) all side panels.
**A:** (a). Same markup and `aria-modal`; a side panel would need non-modal behaviour.

**Q6. Toast.** Moves from 90px to ~24px above the bottom, centred over the content area.
**A:** Yes.

**Q7. Proving 412px is unchanged.** Pixel-diff 412px screenshots of every tab and sheet (light and dark) taken before any change against after; any difference fails. Extend `screens.spec.ts` to a width matrix (412 / 768 / 1280 / 1920 × light/dark × each tab, plus sheets) with a no-horizontal-scroll check; it saves screenshots, it does not compare them.
**A:** Yes to both.

## Round 2: what sits side by side

Fact noted: the behavior lock runs only at 412px and reads `main`'s `innerText` after clicking `nav [data-tab]`. Wrappers must hold no text and be inert at phone width. No `lane`/`rail` class exists in `src/`.

**Q8. Mechanism.** Text-free `<div class="lane">` wrappers per tab, `display:contents` below 720px; at ≥ 720px lanes are grid columns stacking their own cards. Banners and footnotes stay outside, full width.
**A:** Yes.

**Q9. Today.** Tablet: two lanes, left Conditions now + Your materials today, right Do this. Desktop: three, Conditions | Do this | Materials.
**A:** Yes.

**Q10. Farm.** Tablet: Zones full width, profession cards two across. Desktop: left lane (3fr) Zones, right lane (2fr) profession cards stacked. Footnotes full width at the bottom.
**A:** Yes.

**Q11. Prices.** Tablet: left Your prices + Market, right Find. Desktop: three lanes Your prices | Market | Find; two when there is no Market.
**A:** Yes.

**Q12. Professions.** Auto-fill grid of profession cards, columns ≥ 340px, top-aligned: two on tablet, three on desktop. Footnote full width.
**A:** Yes.

**Q13. Session.** Tablet: stacked, capped at 760px. Desktop: length picker in a 320px left lane, steps on the right.
**A:** Yes.

**Q14. Scrolling.** Header fixed top, nav fixed side, `main` stays the only scroller (`render()`'s `scrollTop=0` keeps working). No 96px bottom padding on wide screens.
**A:** Yes.

**Q15. Hover.** On wide screens with a mouse (`hover:hover`), list rows, nav buttons and `.btn` get a subtle chip-coloured hover. Phones unchanged.
**A:** Yes.

**Q16. Phone in landscape.** ~900×412 gets the tablet layout; no height-based rules.
**A:** Yes.

## Round 3: loose ends

**Q17. Sheet contents.** Dialogs are ~560px, so sheet internals keep their phone layout.
**A:** Yes.

**Q18. Branch.** `responsive/layout` from `main`, small commits (about one per plan step), ask before push/PR.
**A:** Yes.

**Q19. Docs.** Update SPEC (screens heading, section 2), CLAUDE.md "Mobile first" (check 412 / 768 / 1280+), the Playwright config comment; add **T8. Responsive layout** to the backlog.
**A:** Yes. And T8 is done now, ahead of T7 (and T4–T6), not after it.
