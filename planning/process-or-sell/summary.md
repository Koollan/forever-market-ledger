# Summary: T9, process or sell (planning)

## Artifacts
- `rough-idea.md`: the brief.
- `idea-honing.md`: grill decisions Q1–Q20 (Nov 18, 2026).
- `research/recipes.md`: recipe ratios, skills, recipe sources and vendor prices, with links.
- `research/existing-code.md`: where the feature hooks in.
- `design/detailed-design.md`: the design.
- `implementation/plan.md`: six test-first steps with a checklist.

## Design in brief
- New `src/data/recipes.ts` covers smelting (including Bronze, Steel, Dark Iron), Transmute: Arcanite, 19 Alchemy elixirs and mana potions, and four leather conversions, plus vendor reagent prices.
- New pure `src/engine/process.ts` lists one- and two-step routes from a material and compares gold kept per craft after the cut. It recommends processing at > 10% and ≥ 1s.
- The advice shows on the material sheet (full breakdown), as Prices row pills and as a Today "Process" card.

## Needs refinement later
- `est` counts (most ore-to-bar ratios, Thick/Rugged Leather, one output per Alchemy craft, Fortitude's reagents, Arcanite's cooldown, Blackrock Depths' level) should be confirmed in game.
- First Aid healing potions and uncatalogued outputs go to T6.

## Next steps
Owner approval of the design and plan, then implement step by step on `t9/process-or-sell`.
