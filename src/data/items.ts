// Item IDs of the catalogued materials, from data/items.json (source: Forever AH /v1/items/search,
// recorded by the T0 backfill; see docs/SOURCES.md). The price files key items by these IDs.
import raw from "../../data/items.json";

export const ITEM_ID: Record<string, number> = Object.fromEntries(
  Object.entries(raw as Record<string, unknown>).filter(([k, v]) => !k.startsWith("_") && typeof v === "number"),
) as Record<string, number>;
