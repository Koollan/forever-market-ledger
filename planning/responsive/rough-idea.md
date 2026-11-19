# Rough idea: responsive layout (T8)

Make the Forever Market Ledger web app adapt to wider screens. Today it is laid out for a phone at every width: on a 1920px desktop it is one narrow centred column, the bottom tab bar spans only that column, and sheets slide up from the bottom.

Wanted: a layout that changes with screen size.
- Multi-column on tablets and desktops (cards in a grid, the Today tab's sections side by side).
- Navigation that suits a wide screen (side or top bar instead of bottom tabs).
- Sheets that become centred dialogs or side panels.
- The 412px phone layout must stay exactly as it is.

Done means: every tab and sheet looks right at 412px (unchanged), about 768px and 1280–1920px, in light and dark, with screenshots at those widths; `npm run check` green; the behavior lock unchanged.

Constraints from the owner: one branch, one PR, ask before pushing. Browser tests import `test` from `tests/e2e/test.ts`. Check for existing CSS class names before adding new ones (a `.spark` collision bit us before). Priority: done now, ahead of T4–T7.
