// US WoW Forever auction houses (ruleset 2) and the four series the pipeline stores.
// Source: Blizzard's house index (/data/wow/ruleset/2/auctions/, read by the T3 probe on Nov 19, 2026)
// and Forever AH's /v1/houses; see docs/SOURCES.md. House 122 does not exist.

export type SeriesId = "alliance" | "horde" | "blackwater" | "all";
export const SERIES_IDS: SeriesId[] = ["alliance", "horde", "blackwater", "all"];

const alliance = [110, 111, 112, 119, 123];
const horde = [113, 114, 115, 120, 124];
const blackwater = [116, 117, 118, 121, 125];

export const SERIES: Record<SeriesId, number[]> = {
  alliance,
  horde,
  blackwater,
  all: [...alliance, ...horde, ...blackwater].sort((a, b) => a - b),
};
