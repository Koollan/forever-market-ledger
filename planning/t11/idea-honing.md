# Idea honing: T11

Decisions from the `/grill-me` session on Nov 19, 2026. Each question went to the owner with a recommendation.

## Facts going in
- Prices search (`vPrices` in `src/ui/views.ts`) filters `MATS` only. With no query it lists "Relevant to you" (gather options and profession needs); with a query it searches all 136.
- Cooking, First Aid and Fishing are already in `PROFS`, but no catalogued material belongs to them.
- The pipeline keeps only `data/items.json` IDs. Blizzard's commodities response already holds every commodity, so new IDs cost no extra requests.
- `us/latest.json` is about 105 KB for 136 items (4 pooled and 15 per-house series), about 0.8 KB per item.
- None of the three reference characters has Cooking or Fishing.

## Round 1
**Q4. Manual-only custom (free-text) items?** Recommended: yes, manual-only with category `Other`.
**Answer:** No. "I'd prefer only items found in the API scan to be listed." An item is listed only if its ID appears in Blizzard's commodities scan.

Q1, Q2, Q3 and Q5 were asked again in round 2, in light of Q4.

## Round 2 (owner: "Yes, all")
**Q1. Curated list or the whole scan?** Options: (b) curated, about 100 items (Cooking and Fishing materials, elementals, gems, oils and similar), each kept only if it is in the scan; (c) every commodity in the scan, which means hundreds to thousands of items, each needing a name, category and tier, and a `latest.json` of several MB.
**Answer:** (b). (c) can be its own task once the number of distinct commodities is known (the probe doesn't report it yet).

**Q2. Where do names and IDs come from?**
**Answer:** the owner allows a one-time lookup through Forever AH's `/v1/items/search`, within its stated limits, logged in `docs/SOURCES.md`. Every ID is then checked against Blizzard's scan, and hand-read Wowhead Forever pages fill any gaps.

**Q3. Categories and conditions rules.**
**Answer:** `Meat`, `Fish` and `Egg` join `RAW` (weekend −7%, midweek +4%). `Elemental` and `Trade good` (and gems, under the existing `Gem` category) get only the tier rules (leveling front, endgame). Tier comes from the drop level or zone level, marked `est` where guessed.

**Q5. Backlog slot.**
**Answer:** a new T11, "Wider catalog". SPEC §8 Q3 is amended.

## Round 3 (owner: "Yes, all")
**Q6. Who picks the exact items?**
**Answer:** the agent drafts the list in `planning/t11/research/items.md`: name, category, tier and source for each, read by hand from Wowhead Forever and guides. The owner reviews it before any lookup.

**Q7. What does the Forever AH call fetch?**
**Answer:** IDs only, with no price history. History for the new items starts with their first hourly Blizzard run.

**Q8. How is "found in the scan" checked?**
**Answer:** a probe report of catalog IDs missing from every house's commodities, plus the count of distinct untracked commodity IDs. The owner runs it once before the merge, and missing items are dropped. After that, an item that sells out later stays listed.

**Q9. Where do new items show up?**
**Answer:** always searchable in Prices. They count as "relevant" (Market and the unsearched list) for characters with the matching profession: Cooking → Meat, Egg and Fish; Fishing → Fish. Farm and Professions are unchanged; fishing spots, beast drops and Cooking `PATHS` belong to T6.

**Q10. Behavior lock and storage.**
**Answer:** the lock must stay unchanged; if it changes, stop and ask the owner. The `prices` branch and `latest.json` growing about 1.7× is accepted.

**Q11. Fix the four renamed elixirs now?**
**Answer:** No, leave them in T6.

## Later decision (step 3 task 02, Nov 19, 2026)
**Q10 revisited: the behavior lock changed.** Each baseline's `engine.shifts` lists every catalog material, so all nine files gained the 109 goods' entries (additions only; tab text and the existing 136 entries unchanged). The agent stopped and asked as agreed.
**Answer:** the owner said "Yes, re-record". Re-recorded in 7eb16b5, with the reason in the commit.
