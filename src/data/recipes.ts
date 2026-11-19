// Recipes that turn one catalogued material into another (T8, process or sell), and vendor reagent prices.
// Sources: planning/process-or-sell/research/recipes.md and docs/SOURCES.md ("Recipes"). `est: true` marks a
// number not confirmed for Forever (Classic value or a guess). Only catalogued outputs and inputs, so both
// sides of a comparison can have a price.
//
// Left out on purpose:
// - Healing potions: Forever moved them to First Aid with new spice reagents; sources disagree on counts (T6).
// - Elixir of Superior Defense: needs Stonescale Oil, which isn't catalogued, so it can't be priced.
// Catalog names for four elixirs are pre-Forever (same item IDs): Lion's Strength = Elixir of Minor Strength,
// Ogre's Strength = Elixir of Ogre Strength, Giants = Elixir of Greater Strength (rename in T6).

export type RecipeProf = "Mining" | "Alchemy" | "Leatherworking";
export type Recipe = {
  out: string; // catalog name
  n: number; // outputs per craft
  prof: RecipeProf;
  skill: number; // skill to learn and craft it
  colors?: [yellow: number, green: number, grey: number]; // skill-up thresholds when the source gives them
  ins: [name: string, count: number][]; // catalogued inputs
  vendor?: [name: string, count: number][]; // vendor reagents (VENDOR)
  learn: "trainer" | string; // otherwise where the recipe comes from
  verb: "Smelt" | "Brew" | "Transmute" | "Convert";
  where?: string; // where it must be made
  minLevel?: number; // level + zone reach must reach this
  cooldown?: string;
  est?: true;
  src: string;
};

const WIKI_MINING = "warcraft.wiki.gg/wiki/Forever_mining_techniques (skill values; counts Classic unless noted)";
const WOWGG_ALCH = "wow.gg/professions/forever/alchemy (skill, reagents, recipe source; one potion per craft est)";
const WIKI_LW = "warcraft.wiki.gg/wiki/Forever_leatherworking_patterns (skill, trainer)";

const smelt = (out: string, ore: string, skill: number, colors: [number, number, number]): Recipe =>
  ({ out, n: 1, prof: "Mining", skill, colors, ins: [[ore, 1]], learn: "trainer", verb: "Smelt", est: true, src: WIKI_MINING });

const brew = (out: string, skill: number, ins: [string, number][], vial: string, learn = "trainer", est?: true): Recipe =>
  ({ out, n: 1, prof: "Alchemy", skill, ins, vendor: [[vial, 1]], learn, verb: "Brew", ...(est ? { est } : {}), src: WOWGG_ALCH });

export const RECIPES: Recipe[] = [
  // Mining: smelting. 1 ore → 1 bar is Classic (est); the Forever wiki gives skills and colors.
  smelt("Copper Bar", "Copper Ore", 1, [25, 47, 70]),
  smelt("Tin Bar", "Tin Ore", 65, [65, 65, 75]),
  smelt("Silver Bar", "Silver Ore", 75, [100, 112, 125]),
  smelt("Iron Bar", "Iron Ore", 125, [130, 135, 140]),
  smelt("Gold Bar", "Gold Ore", 155, [170, 177, 185]),
  smelt("Mithril Bar", "Mithril Ore", 175, [175, 175, 175]),
  smelt("Truesilver Bar", "Truesilver Ore", 230, [230, 230, 230]),
  smelt("Thorium Bar", "Thorium Ore", 250, [250, 250, 250]),
  // Forever: Bronze makes 2 bars (wiki "x2"); 1 + 1 inputs are Classic
  { out: "Bronze Bar", n: 2, prof: "Mining", skill: 65, colors: [65, 90, 115], ins: [["Copper Bar", 1], ["Tin Bar", 1]], learn: "trainer", verb: "Smelt", est: true, src: WIKI_MINING },
  // Coal count from metabot.gg/en/wow-forever/items/coal ("Steel Bar: Mining 165, Coal x1")
  { out: "Steel Bar", n: 1, prof: "Mining", skill: 165, colors: [165, 165, 165], ins: [["Iron Bar", 1]], vendor: [["Coal", 1]], learn: "trainer", verb: "Smelt", src: WIKI_MINING + "; metabot.gg Coal" },
  // 8 ore per bar from the wiki; the Black Forge and Blackrock Depths' minimum level 52 are Classic (est)
  { out: "Dark Iron Bar", n: 1, prof: "Mining", skill: 230, colors: [230, 230, 230], ins: [["Dark Iron Ore", 8]], learn: "trainer", verb: "Smelt",
    where: "the Black Forge in Blackrock Depths", minLevel: 52, est: true, src: WIKI_MINING + "; Black Forge and level 52 Classic" },

  // Alchemy: transmute. Cooldown was 48 h in Classic Era (removed in 2.4.0, Wowpedia); unconfirmed in Forever.
  { out: "Arcanite Bar", n: 1, prof: "Alchemy", skill: 275, ins: [["Thorium Bar", 1], ["Arcane Crystal", 1]], learn: "sold by Alchemist Pestlezugg, Gadgetzan",
    verb: "Transmute", cooldown: "once every 2 days (est.)", est: true, src: WOWGG_ALCH + "; cooldown wowpedia.fandom.com/wiki/Transmute:_Arcanite (Classic)" },

  // Alchemy: mana potions and elixirs (Forever skills and reagents from wow.gg; ratios cross-checked with
  // wow-professions.com/forever/alchemy-leveling-guide)
  brew("Minor Mana Potion", 25, [["Mageroyal", 1], ["Peacebloom", 1]], "Empty Vial"),
  brew("Lesser Mana Potion", 120, [["Mageroyal", 1], ["Stranglekelp", 1]], "Empty Vial"),
  brew("Mana Potion", 160, [["Stranglekelp", 1], ["Kingsblood", 1]], "Leaded Vial"),
  brew("Greater Mana Potion", 205, [["Khadgar's Whisker", 1], ["Goldthorn", 1]], "Leaded Vial"),
  brew("Superior Mana Potion", 260, [["Sungrass", 2], ["Blindweed", 2]], "Crystal Vial", "sold by Ulthir (Darnassus) or Algernon (Undercity)"),
  brew("Major Mana Potion", 295, [["Dreamfoil", 3], ["Icecap", 2]], "Crystal Vial", "sold by Magnus Frostwake (Western Plaguelands)"),
  brew("Elixir of Minor Agility", 50, [["Swiftthistle", 1], ["Silverleaf", 1]], "Empty Vial", "a world drop from level 5–25 mobs"),
  brew("Elixir of Lesser Agility", 140, [["Wild Steelbloom", 1], ["Swiftthistle", 1]], "Leaded Vial", "drops from Rok'Alim the Pounder and Singe"),
  brew("Elixir of Agility", 185, [["Stranglekelp", 1], ["Goldthorn", 1]], "Leaded Vial"),
  brew("Elixir of Greater Agility", 240, [["Sungrass", 1], ["Goldthorn", 1]], "Crystal Vial"),
  brew("Elixir of the Mongoose", 280, [["Mountain Silversage", 2], ["Plaguebloom", 2]], "Crystal Vial", "drops from Jadefire and Legashi Rogues"),
  brew("Elixir of Lion's Strength", 40, [["Earthroot", 1], ["Silverleaf", 1]], "Empty Vial"), // Forever: Elixir of Minor Strength
  brew("Elixir of Ogre's Strength", 150, [["Earthroot", 1], ["Kingsblood", 1]], "Leaded Vial", "drops from Splinter Fist Firemongers and Mudsnout Shamans"), // Forever: Elixir of Ogre Strength
  brew("Elixir of Giants", 245, [["Sungrass", 1], ["Gromsblood", 1]], "Crystal Vial", "drops from Wave Striders and Hitah'ya the Keeper"), // Forever: Elixir of Greater Strength
  brew("Elixir of Wisdom", 90, [["Mageroyal", 1], ["Briarthorn", 2]], "Empty Vial"),
  brew("Elixir of Greater Intellect", 235, [["Blindweed", 1], ["Khadgar's Whisker", 1]], "Crystal Vial"),
  brew("Arcane Elixir", 235, [["Blindweed", 1], ["Goldthorn", 1]], "Crystal Vial"),
  brew("Greater Arcane Elixir", 285, [["Dreamfoil", 3], ["Mountain Silversage", 1]], "Crystal Vial", "drops from Angerclaw Grizzlies and Blighted Horrors"),
  // wow.gg lists 4 Goldthorn; Classic was Wild Steelbloom + Goldthorn. Unverified, so est.
  brew("Elixir of Fortitude", 150, [["Goldthorn", 4]], "Leaded Vial", "trainer", true),

  // Leatherworking: conversions. Medium = 4 Light and Heavy = 5 Medium from Wowhead Forever spells 20648/20649;
  // Thick = 6 Heavy and Rugged = 6 Thick are Classic (est).
  { out: "Medium Leather", n: 1, prof: "Leatherworking", skill: 75, ins: [["Light Leather", 4]], learn: "trainer", verb: "Convert", src: WIKI_LW + "; wowhead.com/forever/spell=20648" },
  { out: "Heavy Leather", n: 1, prof: "Leatherworking", skill: 125, ins: [["Medium Leather", 5]], learn: "trainer", verb: "Convert", src: WIKI_LW + "; wowhead.com/forever/spell=20649" },
  { out: "Thick Leather", n: 1, prof: "Leatherworking", skill: 175, ins: [["Heavy Leather", 6]], learn: "trainer", verb: "Convert", est: true, src: WIKI_LW + "; 6 Heavy is Classic" },
  { out: "Rugged Leather", n: 1, prof: "Leatherworking", skill: 225, ins: [["Thick Leather", 6]], learn: "trainer", verb: "Convert", est: true, src: WIKI_LW + "; 6 Thick is Classic" },
];

// Vendor reagents, copper per unit. Vendors sell vials in stacks of 5 (warcrafttavern.com/forever/guides/alchemy);
// outof.games/forever lists the stack price, so per unit = stack / 5 (= 4 × the vendor sell price).
export const VENDOR: Record<string, { price: number; src: string; est?: true }> = {
  "Empty Vial": { price: 4, src: "outof.games/forever/item/3371: 20c a stack of 5" },
  "Leaded Vial": { price: 40, src: "outof.games/forever/item/3372: 2s a stack of 5" },
  "Crystal Vial": { price: 500, src: "outof.games/forever/item/8925: 25s a stack of 5" },
  Coal: { price: 500, src: "metabot.gg/en/wow-forever/items/coal: 5s (Classic vendor data)", est: true },
};
