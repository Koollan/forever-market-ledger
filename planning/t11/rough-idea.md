# Rough idea: T11, wider catalog

The owner noticed that many in-game materials can't be searched or looked up in the app. One example is Chunk of Boar Meat, which is popular. Prices search only filters the 136 catalogued materials: herbs, skins, ore, cloth, bars, Enchanting materials and consumables. It has no Cooking or Fishing materials and no drop-based trade goods. The price pipeline prices only the item IDs in `data/items.json`, and SPEC §8 Q3 decided it would track only the catalogued materials.

Goal: make popular materials outside the catalog searchable and priced, without scraping and with a source for every datum.
