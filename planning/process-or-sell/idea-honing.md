# Idea honing: process or sell (T8)

Decisions from the `/grill-me` session on Nov 18, 2026. Each question was put to the owner with a recommendation. Round 1: every recommendation accepted except Q2, which the owner widened. Round 2: "All good".

## Round 1

**Q1. Which outputs can be priced?** Only the 136 catalogued materials have item IDs and API prices: 12 bars, five leathers, 26 potions and elixirs. Adding outputs means new IDs in `data/items.json` and a pipeline change.
**Answer:** v1 compares only outputs already in the catalog. No pipeline change. Growing the catalog is a T6 follow-up.

**Q2. Which smelting recipes?** Recommended: Copper, Tin, Silver, Iron, Gold, Mithril, Truesilver, Thorium Bars and the alloys Bronze (Copper Bar + Tin Bar) and Steel (Iron Bar + vendor Coal); leave out Dark Iron (Black Forge in Blackrock Depths) and Arcanite (Alchemy transmute with a cooldown).
**Answer (owner):** include Dark Iron Bar and Arcanite Bar too: Dark Iron when the character is on-level for the Black Forge, Arcanite when the character has the Alchemy to transmute it. Details in Q12–Q14.

**Q3. Chains and alloys?** **Answer:** model each recipe with its real inputs. For a raw material, compare up to two steps (ore → bar → alloy; Light → Medium → Heavy Leather). Never deeper.

**Q4. Alchemy vs First Aid?** Forever moved healing potions to First Aid. **Answer:** each recipe sits under the profession that makes it in Forever, from research. Where Forever data isn't published, use Classic and mark it `est: true`.

**Q5. Whose materials?** **Answer:** the same set as sell advice: what the character priced plus what they gather. No "buy raw, craft, resell" suggestions in v1 (a flip that leans on the budget).

**Q6. Recipe knowledge?** The app knows skill, not learned recipes. **Answer:** trainer recipes count as known once skill reaches the requirement. Vendor or drop recipes are shown with "if you know the recipe" and where the recipe comes from. Quest-only or rare-drop-only recipes are left out.

**Q7. The comparison?** **Answer:** gold kept per craft. Process = output price × (1 − home cut) × output count − vendor reagent costs (fixed vendor prices). Sell raw = Σ input count × input price × (1 − cut). Both sides use the active price now (API p10 or manual entry), the same estimate sell advice uses. Existing list/hold timing then applies to whichever side wins.

**Q8. Threshold?** **Answer:** recommend processing only when it beats selling raw by more than 10% **and** by at least 1 silver per craft. Otherwise silent, or "sell raw" on the material sheet.

**Q9. Missing prices?** **Answer:** no advice on Today or the Market list. The material sheet still lists the conversion with "No price for <item> yet: add one to compare".

**Q10. Where it shows?** **Answer:**
- Material sheet: a "Process or sell" section with each conversion the character can do, gold kept on both sides and the verdict.
- Prices tab (Market list and manual list): a short tag on the row, e.g. "Smelt first +18%".
- Today: one "Process" card with up to two best conversions, only when Q8 passes.
- Session tab unchanged.

**Q11. Skill-ups?** **Answer:** the comparison is gold only. When the recipe is orange or yellow for the character, add "also gives skill-ups".

## Round 2

**Q12. "On-level" for Dark Iron?** **Answer:** offer when level + zone reach ≥ Blackrock Depths' minimum level (52 in Classic, `est: true` until a Forever source) and Mining ≥ the smelt requirement (230 in Classic). The line says "smelt at the Black Forge in Blackrock Depths". Faction and Skyborne don't matter.

**Q13. Arcanite cooldown?** Transmute: Arcanite (Thorium Bar + Arcane Crystal, Alchemy 275 in Classic) has a 48-hour cooldown and is not a trainer recipe. **Answer:** show the per-transmute comparison with "once every 2 days" and "if you know the recipe" plus the recipe's source. The app doesn't track the last transmute. It may appear on the Today card.

**Q14. Arcanite inputs the character doesn't gather?** **Answer:** Q5 stays strict: an Alchemist who doesn't mine sees Arcanite only if they priced Thorium Bar or Arcane Crystal.

**Q15. Behavior lock and tests?** None of the three reference characters has Mining, Alchemy or Leatherworking, so their baselines should not change. **Answer:** no fourth reference character. Unit tests for the comparison (each case, threshold, missing prices, skill and level gates, Dark Iron, Arcanite) and a new e2e spec for the material sheet section and Today card at 412×900 with a Mining/Alchemy test character. If the baseline changes, stop and tell the owner why before re-recording.

**Q16. Backlog and branch?** **Answer:** add **T8. Process or sell** to `docs/SPEC.md` with acceptance criteria. One branch `t8/process-or-sell` from `main`, plans in `planning/process-or-sell/`, one PR, ask before pushing.

## Round 3 (after research, Nov 18, 2026)

Research notes: `research/recipes.md`, `research/existing-code.md`. The owner accepted every recommendation ("Looks good").

**Q17. First Aid healing potions?** Forever moved them to First Aid. Skills are known (55–275), but sources disagree on herb counts and spice prices aren't published. **Answer:** leave them out of v1. Add "First Aid potion recipes" to T6.

**Q18. Drop recipes?** Six catalogued elixirs come from mob drops. **Answer:** include them with "if you know the recipe (drops from …)". Leave out only Elixir of Superior Defense, because its Stonescale Oil input isn't catalogued and can't be priced.

**Q19. Arcanite cooldown?** It was 48 h in Classic and removed in TBC. Forever is unconfirmed. **Answer:** show "once every 2 days (est.)" and record the source in `docs/SOURCES.md`.

**Q20. Research enough?** **Answer:** yes, go to the design and plan. Bring both back for approval before code.
