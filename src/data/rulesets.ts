// WoW Forever rulesets and their auction houses (T10). Each ruleset has its own Alliance, Horde and
// Blackwater house; a character trades only on its own ruleset's houses.
//
// Sources:
// - Ruleset IDs (US and EU: 1 PvP, 2 Normal, 3 Roleplay, 15 Roleplay PvP): Blizzard's ruleset index
//   (T3 probe, planning/t3/research/probe.md) and the Blizzard forum thread in docs/SOURCES.md.
// - One house per region, ruleset and faction: owner (in game, Nov 19, 2026) and community guides.
// - Houses come in five sets of one per faction (110/113/116, 111/114/117, 112/115/118, 119/120/121,
//   123/124/125); set C (112/115/118) is empty. Sets A and B are the busy Normal and PvP houses, D and E
//   the smaller Roleplay ones (michaelwhelehan/forever-build-coach PR #11, Nov 10, 2026; listing counts
//   the owner read on Nov 19, 2026: Normal 170,603, PvP 163,115, RP 45,494, RP-PvP 41,100 on Alliance).
// - Which set within each pair is which is NOT confirmed. The table below is an educated guess (house
//   IDs in the same order as ruleset size), marked est: true. Blizzard's API can't tell: the ruleset in
//   the URL is ignored. Confirm by matching per-house listing counts (us/house-<id>) with a site that
//   labels houses, or by an in-game listing, then set est: false.

export type RulesetKey = "normal" | "pvp" | "rp" | "rppvp";
export type RulesetHouses = { Alliance: number; Horde: number; Blackwater: number };
export type Ruleset = { key: RulesetKey; name: string; apiId: number; houses: RulesetHouses; est: boolean };

export const RULESETS: Ruleset[] = [
  { key: "normal", name: "Normal", apiId: 2, houses: { Alliance: 110, Horde: 113, Blackwater: 116 }, est: true },
  { key: "pvp", name: "PvP", apiId: 1, houses: { Alliance: 111, Horde: 114, Blackwater: 117 }, est: true },
  { key: "rp", name: "Roleplay", apiId: 3, houses: { Alliance: 119, Horde: 120, Blackwater: 121 }, est: true },
  { key: "rppvp", name: "Roleplay PvP", apiId: 15, houses: { Alliance: 123, Horde: 124, Blackwater: 125 }, est: true },
];

export const rulesetOf = (key: unknown): Ruleset | null => RULESETS.find((r) => r.key === key) ?? null;
