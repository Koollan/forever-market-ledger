# Research: step-1 probe results

Run by the owner in the app's terminal on Nov 19, 2026, 02:16 UTC (`node scripts/fetch-prices.ts --mode probe --save-fixture tests/fixtures/auctions`). Read-only, 7 requests. Trimmed responses saved in `tests/fixtures/auctions/`.

## Answers to the three open facts
1. **Materials are commodities.** All 136 tracked materials appear under `/data/wow/ruleset/2/auctions/{houseId}/commodities` (house 110: 94,226 commodity listings, 19,610 of them tracked, covering all 136 items). Each listing is `{id, item: {id}, quantity, unit_price, time_left}`, with `unit_price` per item in copper. The house's regular `auctions` list (118,691 listings, `buyout` or bid-only) holds **none** of the tracked materials.
   → The run reads only `/commodities` for each house: 15 requests, much smaller than the regular auction lists. The reducer still accepts the `buyout` shape, but the pipeline doesn't depend on it.
2. **`Last-Modified` is present** on house and commodity responses (house 110: `Thu, 19 Nov 2026 01:25:08 GMT`, read at 02:16). It matches Forever AH's `last_snapshot` for the same house to the second, so it is Blizzard's snapshot time. → The snapshot hour comes from `Last-Modified`; the run-time fallback stays only as a guard.
3. **Ruleset 2 is valid.** The ruleset index lists 1, 15, 3, 2, and the house index under ruleset 2 lists the expected 15 houses (110–125 without 122) with the faction names in the design.

## Other findings
- House 112 has no `auctions` field, and its `/commodities` returns only `_links` (no `auctions` key at all). The pipeline must treat a missing `auctions` key as zero listings, and the house still counts as read. 115 and 118 are probably the same (one empty house per faction).
- The house response links to its commodities: `commodities: {href: …/auctions/110/commodities?namespace=dynamic-forever-us}`.
- Snapshots land at about :25 past the hour (01:25:08 for 110, 01:24:54 for 112). A run at :17 would read a snapshot about 52 minutes old. **Decided (user, Nov 19):** the cron runs at minute :40, still away from the top of the hour, so each run gets that hour's snapshot about 15 minutes after it lands.
- Response headers include `battlenet-namespace`, `cache-control`, `content-encoding`, `date`, `last-modified`; no rate-limit headers.

## Fixture
- `index.json`: house index.
- `house-110.json`: 15 regular auctions (10 untracked, 5 bid-only), for the `buyout` shape.
- `house-110-commodities.json`: 410 commodity listings across 85 tracked items (first 400 tracked plus 10 untracked).
- `house-112.json`, `house-112-commodities.json`: the empty house.
Each file is `{headers: {last-modified, date}, body}`. This is public game data; nothing account-specific is in it.
