// Auction listings → per-item stats. Pure: takes parsed API bodies, returns plain data.
// Materials are commodities (`unit_price` per item; T3 probe, Nov 19, 2026). Regular auctions
// (`buyout` for the whole stack, or bid-only) are also accepted in case an item moves lists.

export type Listing = { unit: number; qty: number }; // copper per item, items in the listing
// [min, p10, p25, median, qty, listings]; prices in whole copper
export type Row = [number, number, number, number, number, number];
export const FIELDS = ["min", "p10", "p25", "median", "qty", "listings"] as const;

type RawAuction = { item?: { id?: number }; quantity?: number; unit_price?: number; buyout?: number };

// Listings of tracked items in one house's response. A response without `auctions` has none.
export function listingsFrom(body: unknown, tracked: Set<number>): Map<number, Listing[]> {
  const out = new Map<number, Listing[]>();
  const list = (body as { auctions?: unknown })?.auctions;
  if (!Array.isArray(list)) return out;
  for (const a of list as RawAuction[]) {
    const id = a.item?.id, qty = a.quantity;
    if (id == null || !tracked.has(id) || !qty || qty <= 0) continue;
    const unit = a.unit_price != null ? a.unit_price : a.buyout != null ? a.buyout / qty : null;
    if (unit == null) continue; // bid-only
    const xs = out.get(id);
    if (xs) xs.push({ unit, qty });
    else out.set(id, [{ unit, qty }]);
  }
  return out;
}

// Lower weighted percentile: the cheapest unit price at which the running quantity reaches p of the total.
function percentile(sorted: Listing[], total: number, p: number): number {
  const target = p * total;
  let cum = 0;
  for (const x of sorted) {
    cum += x.qty;
    if (cum >= target) return x.unit;
  }
  return sorted[sorted.length - 1].unit;
}

export function stats(listings: Listing[]): Row | null {
  if (!listings.length) return null;
  const sorted = [...listings].sort((a, b) => a.unit - b.unit);
  const total = sorted.reduce((n, x) => n + x.qty, 0);
  const at = (p: number) => Math.round(percentile(sorted, total, p));
  return [Math.round(sorted[0].unit), at(0.1), at(0.25), at(0.5), total, sorted.length];
}
