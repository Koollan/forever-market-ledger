// Classes, professions and consumable tags (Classic-era rules used by WoW Forever)
export type ClassInfo = { c: string; armor: (level: number) => string[]; suf: string[]; mana: boolean };

export const CLASSES: Record<string, ClassInfo> = {
 Warrior:{c:"#C79C6E",armor:l=>l>=40?["Plate","Mail"]:["Mail","Leather"],suf:["Bear","Tiger","Monkey","Power","Strength","Stamina","Defense","Champion"],mana:false},
 Paladin:{c:"#F58CBA",armor:l=>l>=40?["Plate","Mail"]:["Mail"],suf:["Gorilla","Bear","Tiger","Healing","Eagle","Strength","Champion"],mana:true},
 Hunter:{c:"#ABD473",armor:l=>l>=40?["Mail","Leather"]:["Leather"],suf:["Monkey","Falcon","Wolf","Agility","Power","Tiger"],mana:true},
 Rogue:{c:"#E6D45A",armor:()=>["Leather"],suf:["Monkey","Tiger","Power","Agility","Bear"],mana:false},
 Priest:{c:"#B9C4CC",armor:()=>["Cloth"],suf:["Owl","Eagle","Healing","Whale","Shadow Wrath","Spirit","Intellect","Sorcery"],mana:true},
 Shaman:{c:"#2B8BE6",armor:l=>l>=40?["Mail","Leather"]:["Leather"],suf:["Eagle","Owl","Gorilla","Healing","Tiger","Nature's Wrath"],mana:true},
 Mage:{c:"#69CCF0",armor:()=>["Cloth"],suf:["Eagle","Owl","Sorcery","Frozen Wrath","Fiery Wrath","Arcane Wrath","Intellect"],mana:true},
 Warlock:{c:"#9482C9",armor:()=>["Cloth"],suf:["Eagle","Shadow Wrath","Fiery Wrath","Whale","Sorcery","Stamina"],mana:true},
 Druid:{c:"#FF7D0A",armor:()=>["Leather"],suf:["Owl","Eagle","Monkey","Healing","Nature's Wrath","Bear","Wolf"],mana:true}
};
export const PROFS: string[] = ["Herbalism","Skinning","Mining","Alchemy","Blacksmithing","Enchanting","Engineering","Leatherworking","Tailoring","Cooking","First Aid","Fishing"];
export const CONS_TAGS: Record<string, string[]> = {Warrior:["all","str","blade","blunt","tank"],Paladin:["all","mana","str","int","blunt","tank"],Hunter:["all","mana","agi"],Rogue:["all","agi","blade","Rogue"],Priest:["all","mana","int","Priest"],Shaman:["all","mana","int","str","blunt"],Mage:["all","mana","int","Mage"],Warlock:["all","mana","int"],Druid:["all","mana","int","agi"]};
