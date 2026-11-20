# Summary: T11, wider catalog

Grill and PDD, Nov 19, 2026. Awaiting the owner's approval of the design and plan.

## Artifacts
- `rough-idea.md`: the problem (Chunk of Boar Meat and similar goods can't be found or priced).
- `idea-honing.md`: the three grill rounds and the owner's answers.
- `research/existing-code.md`: the catalog, search, pipeline, probe and lookup code T11 touches.
- `design/detailed-design.md`: requirements, components, data model, errors and tests.
- `implementation/plan.md`: five steps with a checklist.

## Design in brief
About 100 curated goods (Cooking meats, eggs and fish, elementals, gems, oils) go into a new `src/data/goods.ts`. Each is sourced and tiered, and joins `MATS` and `data/items.json`. Names and IDs come from a one-time, IDs-only Forever AH lookup (owner-approved), with Wowhead by hand for gaps. A new coverage probe confirms each ID is a commodity in Blizzard's scan, and anything missing is dropped. Meat, Fish and Egg are `RAW`. Cooking and Fishing characters see the relevant goods unsearched. The hourly pipeline prices them with no workflow change.

## Next steps
1. The owner approves the design and plan.
2. `/code-task-generator` on the plan, then `/tdd` step by step. Step 2 (the item list) and step 3's coverage run need the owner.
3. `/code-review`, then ask before the PR.

## Open for later
- A "whole scan" catalog, once step 1 reports the number of distinct commodities.
- Fishing spots, beast drops, and Cooking and First Aid recipe paths (T6).
