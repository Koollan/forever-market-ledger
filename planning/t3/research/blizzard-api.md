# Research: Blizzard Game Data API for WoW Forever auctions

Checked Nov 18, 2026, without calling Blizzard's API (no credentials yet). Blizzard has not published Forever-specific docs; the endpoint facts come from developers probing the API.

## Sources
- Blizzard forums, "WoW: Forever API: what works so far, plus a TS client": https://us.forums.blizzard.com/en/blizzard/t/wow-forever-api-what-works-so-far-plus-a-ts-client/60334
- Everloot PR #867 (namespaces answer 200 as of Nov 6, 2026; 15 houses under every ruleset): https://github.com/Everloot/everloot/pull/867
- Forever AH house list, `GET https://forever-ah.com/v1/houses` (read once, Nov 19 01:25 UTC)
- Rate limits: https://us.forums.blizzard.com/en/blizzard/t/api-access-clients-rate-limits/5602
- Client credentials: https://us.forums.blizzard.com/en/blizzard/t/oauth2-client-credentials-implementations/131/5

## Auth
- `POST https://oauth.battle.net/token`, HTTP Basic auth with client ID and secret, form body `grant_type=client_credentials`. Token lasts 24 h (`expires_in` 86400).
- Send as `Authorization: Bearer <token>` on `https://us.api.blizzard.com`.
- Limits: 36,000 requests per hour and 100 per second per client; over the limit gives 429.

## Namespaces and rulesets
- `static-forever-us`, `dynamic-forever-us`, `profile-forever-us` (also EU, KR, TW).
- Rulesets replace realms: `/data/wow/ruleset/index`; US and EU IDs 1 (PvP), 2 (Normal), 3 (Roleplay), 15 (Roleplay PvP). `/data/wow/realm/index` is 404.
- Every ruleset returns the same houses and auctions: fetch once (ruleset 2), never sum across rulesets.

## Auction endpoints (namespace `dynamic-forever-us`)
| Path | Returns |
|---|---|
| `/data/wow/ruleset/2/auctions/` (trailing slash required) | `{auctions: [{key, name, id}]}`: the house index |
| `/data/wow/ruleset/2/auctions/{houseId}` | `{id, name, auctions, commodities, ruleset}`; each auction `{id, item:{id, …}, buyout?, bid?, quantity, time_left}` |
| `/data/wow/ruleset/2/auctions/{houseId}/commodities` | `{auctions: [{id, item, quantity, unit_price, time_left}]}` |

- Some auctions are bid-only (no `buyout`). Commodities use `unit_price`; regular auctions use `buyout` for the whole stack.
- Houses 112, 115, 118 sometimes have no `auctions` field: treat it as optional.
- Busy houses hold 50–68k auctions, about 9 MB per response. 15 houses ≈ 100 MB per run, well within a GitHub runner.
- The legacy `/data/wow/auctions/commodities` is 404.
- 43% of Forever item IDs seen in one house 404 on `/data/wow/item/{id}` in `static-forever`: another reason not to depend on the static item API.

## US houses (ruleset 2)
| Faction | House IDs |
|---|---|
| Alliance Auction House | 110, 111, 112, 119, 123 |
| Horde Auction House | 113, 114, 115, 120, 124 |
| Blackwater Auction House | 116, 117, 118, 121, 125 |

122 does not exist. No public source maps characters to one of the five same-faction houses. Forever AH's unified US view (house key 17, the T0 source) pools all 15.

## Cadence
Forever AH's `last_snapshot` times and its docs indicate Blizzard refreshes the auction data about once an hour per house.

## GitHub Actions facts
- Public repository: standard runners are free with no minute quota.
- Scheduled workflows run only from the default branch and can be delayed at busy times (top of the hour).
- Pushes made with `GITHUB_TOKEN` do not trigger other workflows, so data commits do not redeploy Pages or run CI.

## Open (step-1 probe)
Commodities vs auctions path for materials; `Last-Modified` header presence; ruleset 2 validity.
