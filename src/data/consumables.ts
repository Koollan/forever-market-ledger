// Consumables players buy, and auction house cuts
export type Consumable = [name: string, minLevel: number, who: string];

export const CONSUMABLES: Consumable[] = [ // [name, min level, who]
 ["Minor Healing Potion",1,"all"],["Lesser Healing Potion",3,"all"],["Healing Potion",12,"all"],["Greater Healing Potion",21,"all"],["Superior Healing Potion",35,"all"],["Major Healing Potion",45,"all"],
 ["Minor Mana Potion",5,"mana"],["Lesser Mana Potion",14,"mana"],["Mana Potion",22,"mana"],["Greater Mana Potion",31,"mana"],["Superior Mana Potion",41,"mana"],["Major Mana Potion",49,"mana"],
 ["Elixir of Minor Agility",2,"agi"],["Elixir of Lesser Agility",18,"agi"],["Elixir of Agility",27,"agi"],["Elixir of Greater Agility",38,"agi"],["Elixir of the Mongoose",46,"agi"],
 ["Elixir of Lion's Strength",1,"str"],["Elixir of Ogre's Strength",20,"str"],["Elixir of Giants",46,"str"],
 ["Elixir of Wisdom",10,"int"],["Elixir of Greater Intellect",37,"int"],["Arcane Elixir",37,"int"],["Greater Arcane Elixir",47,"int"],
 ["Elixir of Fortitude",25,"all"],["Elixir of Superior Defense",43,"tank"],
 ["Rough Sharpening Stone",1,"blade"],["Coarse Sharpening Stone",15,"blade"],["Heavy Sharpening Stone",25,"blade"],["Solid Sharpening Stone",35,"blade"],["Dense Sharpening Stone",45,"blade"],
 ["Heavy Weightstone",25,"blunt"],["Solid Weightstone",35,"blunt"],["Dense Weightstone",45,"blunt"],
 ["Flash Powder",22,"Rogue"],["Arcane Powder",56,"Mage"],["Sacred Candle",60,"Priest"],["Symbol of Kings",52,"Paladin"]
];
export const HOUSES: Record<string, { cut: number; label: string }> = {Alliance:{cut:.05,label:"Alliance AH"},Horde:{cut:.05,label:"Horde AH"},Blackwater:{cut:.15,label:"Blackwater (neutral)"}};
