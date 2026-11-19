# Research: stored data and the export format

## What is stored today

**`localStorage["fml-cache"]`** (always written, `cacheLocal`):

```json
{
  "state": {
    "characters": [
      {"id":"ex","name":"Example rogue","cls":"Rogue","level":15,"faction":"Alliance","region":"us",
       "gold":null,"stretch":2,"skyborne":false,
       "profs":[{"name":"Herbalism","skill":90},{"name":"Skinning","skill":80}],"example":true}
    ],
    "activeId": "ex",
    "toggles": {}
  },
  "items": {
    "item~peacebloom": {"key":"item~peacebloom","name":"Peacebloom","hist":[{"t":1794950000000,"price":82}]}
  }
}
```

- `stretch` is the character sheet's "zone reach" (+0..+5; missing means 2). `gold` is copper or `null` (use the level estimate). `skyborne` is a boolean on every saved character; the built-in example character lacks it. `example: true` marks that example, which is replaced on the first save.
- `items` keys come from `keyOf(name)`; each `hist` keeps the last 60 entries, prices in copper, `t` in Unix milliseconds. Entries closer than 10 minutes are replaced.
- `toggles` is passed into the conditions engine, but nothing in the current UI sets it, so it is always `{}` in practice.

**claude.ai `db`** (only inside claude.ai): collection `data/users/{uid}`, one doc `state` (same shape as `state` above) and one doc per `item~…` key (same shape as an `items` value). On boot inside claude.ai the `db` copy wins over the local cache.

## Implications for the export format

- Export must be built from what the app holds in memory (`S.state` + `S.items`), which is identical in both hosts. That makes the T1 button work in the claude.ai version, where the data lives in `db`.
- For an exact round trip, the export needs `activeId` as well as characters and prices; otherwise import would reset the active character. `toggles` is included too so the state round-trips byte for byte, even though it is always `{}` today. Proposed shape (refines decision Q10):

```json
{
  "app": "forever-market-ledger",
  "version": 1,
  "exportedAt": 1795046400000,
  "characters": [ ... ],
  "activeId": "ex",
  "toggles": {},
  "prices": { "item~peacebloom": {"key":"item~peacebloom","name":"Peacebloom","hist":[ ... ]} }
}
```

- Validation for all-or-nothing import (decision Q4): `app` matches, `version` is 1, `characters` is a non-empty array with valid `id`/`name`/`cls`/`level`/`faction`, `activeId` matches one of them, every price has a `name` and a `hist` of `{t: number, price: number}`. Boot's existing `clean()` filter (drop items without a valid `hist`) is the current, looser version of the same idea.
- In claude.ai the file picker is blocked (spec T1), and clipboard writes from an embedded frame may be refused, so the Copy button needs a fallback: select the text in the box so the user can copy it by hand.
