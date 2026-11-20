# T11 item list (draft for the owner's review)

Drafted Nov 19, 2026 by reading public guide pages, nothing automated. **109 items.** Nothing is in the code yet. After you approve, step 3 looks up each name's ID through Forever AH (IDs only) and you run the coverage probe; any item with no ID or missing from every house is dropped and noted here.

**Approved by the owner on Nov 19, 2026** ("Approve list"), with no edits.

## How tiers were set
- Tier is the app's level-bracket rule, `floor(level/10)+1`, from 1 to 6.
- **Cooking and Fishing items:** the guides give a skill bracket, not a drop level. As for herbs without a zone, level ≈ skill/5. So a bracket starting at 1 gives tier 1, at 50 tier 2, at 100 tier 3, at 150 tier 4, at 225 tier 5, and at 275 or above tier 6. Every tier from this proxy is `est`.
- **Everything else:** the Classic drop or zone level, `est`.

## Sources
- **WP-C:** [wow-professions: Forever cooking leveling guide](https://www.wow-professions.com/forever/cooking-leveling-guide). Says it is "based on the Forever beta"; no date shown.
- **WH-C:** [Wowhead: Forever cooking leveling guide](https://www.wowhead.com/forever/profession-leveling-guides/cooking). Last updated Nov 3, 2026.
- **WP-F:** [wow-professions: Forever fishing leveling guide](https://www.wow-professions.com/forever/fishing-leveling-guide). Gives the skill brackets by zone: 1–75 starting zones, 75–150, 150–225 and 225–300.
- **CL:** Classic item, not seen on a readable Forever page. Wowhead's Forever item-category pages render their lists client-side, the wiki category pages 404, and Icy Veins refused the fetch (403). The name, the category and the existence in Forever are confirmed by the step 3 lookup and coverage probe.

Not catalogued, because vendors sell them: Mild Spices, Hot Spices, Soothing Spices, Refreshing Spring Water, Shiny Red Apple and Alterac Swiss (WP-C). Also left out: the Artisan quest fish (Feralas Ahi, Misty Reed Mahi Mahi, Sar'theris Striker, Savage Coast Blue Sailfin), which are quest items (WP-F).

## Meat: `RAW`, relevant to Cooking (35)
| Name | Tier | Source | Note |
|---|---|---|---|
| Chunk of Boar Meat | 1 | WP-C (1–50) | Roasted Boar Meat |
| Stringy Wolf Meat | 1 | WP-C (1–50) | Charred Wolf Meat |
| Meaty Bat Wing | 1 | WP-C (1–50) | Horde alternative |
| Scorpid Stinger | 1 | WP-C (1–50) | Horde alternative |
| Small Spider Leg | 1 | WP-C (1–50) | Alliance alternative |
| Stringy Vulture Meat | 1 | CL | |
| Bear Meat | 2 | WP-C (50–100) | Smoked Bear Meat |
| Strider Meat | 2 | WP-C (50–100) | Strider Stew |
| Crawler Claw | 3 | WP-C (100–130) | Cooked Crab Claw |
| Boar Ribs | 2 | CL | |
| Coyote Meat | 2 | CL | |
| Goretusk Liver | 2 | CL | |
| Crawler Meat | 2 | CL | |
| Crisp Spider Meat | 2 | CL | |
| Kodo Meat | 2 | CL | |
| Lean Wolf Flank | 2 | CL | |
| Lean Venison | 2 | CL | |
| Murloc Fin | 2 | CL | |
| Murloc Eye | 2 | CL | |
| Crocolisk Meat | 2 | CL | |
| Clam Meat | 2 | CL | |
| Lion Meat | 3 | WP-C (130–150) | Hot Lion Chops |
| Tangy Clam Meat | 3 | WP-C (130–150) | Goblin Deviled Clams |
| Turtle Meat | 4 | WP-C (175–225) | Soothing Turtle Bisque |
| Raptor Flesh | 4 | WP-C (175–225) | Roast Raptor |
| Big Bear Meat | 3 | CL | |
| Gooey Spider Leg | 3 | CL | |
| Tender Crocolisk Meat | 3 | CL | |
| Thunder Lizard Tail | 3 | CL | |
| Red Wolf Meat | 4 | CL | |
| Tiger Meat | 4 | CL | |
| Heavy Kodo Meat | 4 | CL | |
| White Spider Meat | 4 | CL | |
| Tender Wolf Meat | 5 | CL | |
| Zesty Clam Meat | 5 | WP-C (225–300) | Artisan quest, "buy it on the AH" |

## Egg: `RAW`, relevant to Cooking (3)
| Name | Tier | Source | Note |
|---|---|---|---|
| Small Egg | 1 | CL | Herb Baked Egg |
| Raptor Egg | 3 | WP-C (130–150) | Curiously Tasty Omelet |
| Giant Egg | 5 | WP-C, WH-C (225–300) | Artisan quest |

## Fish: `RAW`, relevant to Cooking and Fishing (22)
| Name | Tier | Source | Note |
|---|---|---|---|
| Raw Brilliant Smallfish | 1 | WP-C, WH-C (1–50) | |
| Raw Slitherskin Mackerel | 1 | WP-C (1–50) | |
| Raw Longjaw Mud Snapper | 2 | WP-C, WH-C (50–100) | |
| Raw Rainbow Fin Albacore | 2 | WP-C (50–100) | |
| Raw Loch Frenzy | 2 | CL | |
| Raw Sagefish | 2 | CL | |
| Oily Blackmouth | 2 | CL | Blackmouth Oil |
| Deviate Fish | 2 | CL | |
| Raw Bristle Whisker Catfish | 3 | WP-C (100–150), WH-C (100–175) | |
| Firefin Snapper | 3 | CL | Fire Oil |
| Raw Mithril Head Trout | 4 | WP-C, WH-C (175–225) | WP-C also spells it "Mithril Headed Trout"; the lookup decides |
| Raw Rockscale Cod | 4 | CL | |
| Raw Greater Sagefish | 4 | CL | |
| Raw Spotted Yellowtail | 5 | WP-C (225–285), WH-C (225–275) | |
| Raw Redgill | 5 | WP-C (225–285) | |
| Raw Glossy Mightfish | 5 | CL | |
| Raw Summer Bass | 5 | CL | |
| Stonescale Eel | 5 | CL | Stonescale Oil |
| Raw Nightfin Snapper | 6 | WP-C (285–300) | |
| Large Raw Mightfish | 6 | WH-C (275–300) | |
| Raw Sunscale Salmon | 6 | CL | |
| Raw Whitescale Salmon | 6 | CL | |

## Elemental: tier rules only (16)
| Name | Tier | Source |
|---|---|---|
| Elemental Earth | 4 | CL |
| Elemental Fire | 4 | CL |
| Elemental Water | 4 | CL |
| Elemental Air | 4 | CL |
| Heart of Fire | 4 | CL |
| Core of Earth | 4 | CL |
| Globe of Water | 4 | CL |
| Breath of Wind | 4 | CL |
| Ichor of Undeath | 5 | CL |
| Heart of the Wild | 5 | CL |
| Essence of Fire | 6 | CL |
| Essence of Earth | 6 | CL |
| Essence of Water | 6 | CL |
| Essence of Air | 6 | CL |
| Essence of Undeath | 6 | CL |
| Living Essence | 6 | CL |

## Gem: existing `Gem` category, tier rules only (18)
| Name | Tier | Source |
|---|---|---|
| Malachite | 1 | CL |
| Tigerseye | 1 | CL |
| Shadowgem | 2 | CL |
| Moss Agate | 2 | CL |
| Small Lustrous Pearl | 2 | CL |
| Lesser Moonstone | 3 | CL |
| Jade | 3 | CL |
| Iridescent Pearl | 3 | CL |
| Citrine | 4 | CL |
| Aquamarine | 4 | CL |
| Black Pearl | 4 | CL |
| Star Ruby | 5 | CL |
| Golden Pearl | 5 | CL |
| Blue Sapphire | 6 | CL |
| Large Opal | 6 | CL |
| Huge Emerald | 6 | CL |
| Azerothian Diamond | 6 | CL |
| Black Diamond | 6 | CL |

## Trade good: tier rules only (15)
| Name | Tier | Source | Note |
|---|---|---|---|
| Spider's Silk | 2 | CL | |
| Thick Spider's Silk | 4 | CL | |
| Shadow Silk | 4 | CL | |
| Ironweb Spider Silk | 6 | CL | |
| Blackmouth Oil | 2 | CL | crafted from Oily Blackmouth |
| Fire Oil | 3 | CL | crafted from Firefin Snapper |
| Stonescale Oil | 5 | CL | crafted from Stonescale Eel (T6 wants it for recipes) |
| Wildvine | 5 | CL | |
| Deeprock Salt | 6 | CL | |
| Righteous Orb | 6 | CL | |
| Demonic Rune | 6 | CL | |
| Larval Acid | 6 | CL | |
| Blood of the Mountain | 6 | CL | |
| Fiery Core | 6 | CL | |
| Lava Core | 6 | CL | |

## Questions for your review
1. Are any of these not worth listing, or are popular items missing?
2. Is it fine that 84 of the 109 items rest on Classic names (`CL`), with the lookup and your coverage probe as the Forever check?
3. Murloc Fin, Murloc Eye, Crawler Claw, clams, Meaty Bat Wing, Scorpid Stinger and spider legs are filed as `Meat`, so they get the weekend and midweek shifts. Is that fine?
