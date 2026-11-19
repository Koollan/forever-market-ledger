// US WoW Forever auction houses (read through ruleset 2) and the series the pipeline stores.
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

// T10: one stored series per house, kept beside the pooled ones. Rulesets (PvE, PvP, RP, RP-PvP) have
// separate auction houses (owner, Nov 19, 2026), so the faction series above pool several markets.
// Which house belongs to which ruleset is not confirmed yet; storing every house keeps that history.
export type HouseSeriesId = `house-${number}`;
export const houseSeries = (house: number): HouseSeriesId => `house-${house}`;
export type StoredSeries = SeriesId | HouseSeriesId;
export const HOUSE_SERIES: HouseSeriesId[] = [...SERIES.all].map(houseSeries);

// The houses a stored series pools: a faction series' houses, or the one house of a house series
export function housesOf(series: StoredSeries): number[] {
  return series.startsWith("house-") ? [Number(series.slice(6))] : SERIES[series as SeriesId] ?? [];
}

// Compare Blizzard's house index (/data/wow/ruleset/2/auctions/) with the fixed house list, so a run can
// flag a house Blizzard added or dropped instead of silently missing it.
export function indexDiff(index: unknown, known: number[]): { added: number[]; missing: number[] } {
  const list = (index as { auctions?: { id?: unknown }[] })?.auctions;
  const ids = new Set(Array.isArray(list) ? list.map((h) => h.id).filter((id): id is number => typeof id === "number") : []);
  return {
    added: [...ids].filter((id) => !known.includes(id)).sort((a, b) => a - b),
    missing: known.filter((id) => !ids.has(id)),
  };
}
