# Rough idea: process or sell (T8)

The owner asked whether sale advice considers smelting ore into bars, refining herbs into potions, or converting leather to higher tiers. It doesn't: `sellAdvice` (`src/engine/suggestions.ts`) decides list now vs hold for each material on its own, from condition windows. `SMELT` (`src/data/gathering.ts`) only feeds `canGather` and the zone dossier. Nothing models recipes or compares input value with output value.

Add "process or sell" advice: for materials the character holds or gathers, compare selling the raw material with selling what the character can make from it.

- Ore → bars via Mining (smelting), including alloys such as Bronze (Copper + Tin) and Steel (Iron + Coal).
- Herbs → potions and elixirs via Alchemy, counting vials and other vendor reagents.
- Lower leather → higher leather via Leatherworking (Light → Medium → Heavy).

Offer a conversion only when the character has the profession and skill. Compare after the AH cut, using the active price (API p10 or a manual entry) on both sides.
