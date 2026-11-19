// Zones, leather tiers, special skins, continents and node density
export type Zone = { name: string; min: number; max: number; f: "A" | "H" | "C"; herbs: string[]; ores: string[];
  est?: boolean; herbsUnknown?: boolean; skyborne?: boolean; [flag: string]: unknown };
type ZoneRow = [string, number, number, string, string[], string[], Record<string, unknown>?];

/* Zones: [name, minLvl, maxLvl, faction A/H/C, herbs, ores]. Skinning tiers come from mob level. */
export const ZONES: Zone[] = ([
 ["Elwynn Forest",1,10,"A",["Peacebloom","Silverleaf","Earthroot"],["Copper Ore"]],
 ["Dun Morogh",1,10,"A",["Peacebloom","Silverleaf","Earthroot"],["Copper Ore"]],
 ["Teldrassil",1,10,"A",["Peacebloom","Silverleaf","Earthroot"],[]],
 ["Durotar",1,10,"H",["Peacebloom","Silverleaf","Earthroot"],["Copper Ore"]],
 ["Mulgore",1,10,"H",["Peacebloom","Silverleaf","Earthroot"],["Copper Ore"]],
 ["Tirisfal Glades",1,10,"H",["Peacebloom","Silverleaf","Earthroot"],["Copper Ore"]],
 ["Zephras Isle",1,12,"C",["Peacebloom","Silverleaf","Earthroot","Mageroyal"],["Copper Ore","Tin Ore"],{skyborne:true}],
 ["Westfall",10,20,"A",["Peacebloom","Silverleaf","Earthroot","Mageroyal","Briarthorn","Bruiseweed"],["Copper Ore","Tin Ore"]],
 ["Loch Modan",10,20,"A",["Peacebloom","Silverleaf","Earthroot","Mageroyal","Briarthorn"],["Copper Ore","Tin Ore"]],
 ["Darkshore",10,20,"A",["Earthroot","Mageroyal","Briarthorn","Stranglekelp"],["Copper Ore","Tin Ore"]],
 ["Silverpine Forest",10,20,"H",["Peacebloom","Silverleaf","Earthroot","Mageroyal","Briarthorn","Stranglekelp"],["Copper Ore","Tin Ore"]],
 ["The Barrens",10,25,"H",["Peacebloom","Silverleaf","Earthroot","Mageroyal","Briarthorn","Stranglekelp","Bruiseweed"],["Copper Ore","Tin Ore","Silver Ore"]],
 ["Redridge Mountains",15,25,"A",["Earthroot","Mageroyal","Briarthorn","Bruiseweed"],["Copper Ore","Tin Ore","Silver Ore"]],
 ["Stonetalon Mountains",15,27,"C",["Mageroyal","Briarthorn","Stranglekelp","Bruiseweed","Wild Steelbloom","Kingsblood"],["Copper Ore","Tin Ore","Silver Ore"]],
 ["Ashenvale",18,30,"C",["Briarthorn","Stranglekelp","Bruiseweed","Wild Steelbloom","Kingsblood"],["Tin Ore","Silver Ore","Iron Ore"]],
 ["Duskwood",18,30,"A",["Briarthorn","Bruiseweed","Wild Steelbloom","Grave Moss","Kingsblood"],["Tin Ore","Silver Ore","Iron Ore"]],
 ["Wetlands",20,30,"A",["Briarthorn","Stranglekelp","Bruiseweed","Wild Steelbloom","Kingsblood"],["Tin Ore","Silver Ore","Iron Ore"]],
 ["Hillsbrad Foothills",20,30,"C",["Briarthorn","Bruiseweed","Wild Steelbloom","Kingsblood"],["Tin Ore","Silver Ore","Iron Ore"]],
 ["Thousand Needles",25,35,"C",["Bruiseweed","Wild Steelbloom","Kingsblood"],["Tin Ore","Silver Ore","Iron Ore"]],
 ["Alterac Mountains",30,40,"C",["Kingsblood","Liferoot","Wild Steelbloom","Fadeleaf","Goldthorn","Khadgar's Whisker","Wintersbite"],["Iron Ore","Gold Ore","Mithril Ore"]],
 ["Arathi Highlands",30,40,"C",["Kingsblood","Liferoot","Fadeleaf","Goldthorn","Khadgar's Whisker"],["Tin Ore","Silver Ore","Iron Ore","Gold Ore","Mithril Ore"]],
 ["Desolace",30,40,"C",["Kingsblood","Liferoot","Wild Steelbloom","Gromsblood","Ghost Mushroom"],["Iron Ore","Gold Ore","Mithril Ore"]],
 ["Stranglethorn Vale",30,45,"C",["Bruiseweed","Wild Steelbloom","Kingsblood","Liferoot","Fadeleaf","Goldthorn","Khadgar's Whisker","Purple Lotus"],["Tin Ore","Silver Ore","Iron Ore","Gold Ore","Mithril Ore"]],
 ["Dustwallow Marsh",35,45,"C",["Kingsblood","Liferoot","Fadeleaf","Goldthorn","Khadgar's Whisker"],["Iron Ore","Gold Ore","Mithril Ore"]],
 ["Badlands",35,45,"C",["Goldthorn","Purple Lotus","Firebloom"],["Iron Ore","Gold Ore","Mithril Ore","Truesilver Ore"]],
 ["Swamp of Sorrows",35,45,"C",["Liferoot","Fadeleaf","Goldthorn","Khadgar's Whisker","Blindweed"],["Iron Ore","Gold Ore","Mithril Ore"]],
 ["The Riverglades",35,45,"C",["Liferoot","Fadeleaf","Goldthorn","Khadgar's Whisker","Kingsblood"],["Iron Ore","Gold Ore","Mithril Ore"],{est:true}],
 ["Shen'dralas",40,53,"C",["Goldthorn","Khadgar's Whisker","Purple Lotus","Sungrass"],["Mithril Ore","Truesilver Ore"],{est:true}],
 ["Feralas",40,50,"C",["Goldthorn","Khadgar's Whisker","Purple Lotus","Sungrass","Ghost Mushroom","Golden Sansam"],["Mithril Ore","Truesilver Ore"]],
 ["Tanaris",40,50,"C",["Firebloom","Purple Lotus"],["Gold Ore","Mithril Ore","Truesilver Ore"]],
 ["The Hinterlands",40,50,"C",["Khadgar's Whisker","Goldthorn","Purple Lotus","Sungrass","Golden Sansam","Ghost Mushroom"],["Mithril Ore","Truesilver Ore","Thorium Ore"]],
 ["Searing Gorge",43,50,"C",["Firebloom"],["Mithril Ore","Truesilver Ore","Thorium Ore","Dark Iron Ore"]],
 ["Azshara",45,55,"C",["Sungrass","Golden Sansam","Dreamfoil","Mountain Silversage"],["Mithril Ore","Truesilver Ore","Thorium Ore"]],
 ["Blasted Lands",45,55,"C",["Firebloom","Gromsblood","Sungrass"],["Thorium Ore"]],
 ["Felwood",48,55,"C",["Gromsblood","Golden Sansam","Dreamfoil","Plaguebloom"],["Thorium Ore"]],
 ["Un'Goro Crater",48,55,"C",["Sungrass","Golden Sansam","Dreamfoil","Mountain Silversage","Black Lotus"],["Thorium Ore","Arcane Crystal"]],
 ["Burning Steppes",50,58,"C",["Sungrass","Golden Sansam","Dreamfoil","Mountain Silversage","Black Lotus"],["Thorium Ore","Dark Iron Ore","Arcane Crystal"]],
 ["Western Plaguelands",51,58,"C",["Arthas' Tears","Sungrass","Golden Sansam","Dreamfoil","Plaguebloom"],["Thorium Ore"]],
 ["Eastern Plaguelands",53,60,"C",["Arthas' Tears","Plaguebloom","Golden Sansam","Dreamfoil","Black Lotus"],["Thorium Ore","Arcane Crystal"]],
 ["Winterspring",55,60,"C",["Icecap","Mountain Silversage","Black Lotus"],["Thorium Ore","Arcane Crystal"]],
 ["Silithus",55,60,"C",["Dreamfoil","Mountain Silversage","Black Lotus"],["Thorium Ore","Arcane Crystal"]],
 ["Mount Hyjal",60,60,"C",[],["Thorium Ore","Heavy Thorium Ore"],{herbsUnknown:true}]
] as ZoneRow[]).map(([name,min,max,f,herbs,ores,x])=>Object.assign({name,min,max,f:f as Zone["f"],herbs,ores},x||{}));
export const ZONE: Record<string, Zone> = Object.fromEntries(ZONES.map(z=>[z.name,z]));
export const STONE_OF: Record<string, string> = {"Rough Stone":"Copper Ore","Coarse Stone":"Tin Ore","Heavy Stone":"Iron Ore","Solid Stone":"Mithril Ore","Dense Stone":"Thorium Ore"};
export const LEATHER_TIERS: [tier: string, lo: number, hi: number][] = [["Light",1,27],["Medium",15,36],["Heavy",25,46],["Thick",35,63],["Rugged",43,63]]; // beast levels that drop each tier
export const SKIN_SPECIAL: Record<string, string[]> = {"Deviate Scale":["The Barrens"],"Black Whelp Scale":["Redridge Mountains","Wetlands"],"Green Whelp Scale":["Wetlands"],"Turtle Scale":["Swamp of Sorrows","Feralas","The Hinterlands"],"Scorpid Scale":["Tanaris","Burning Steppes"],"Worn Dragonscale":["Swamp of Sorrows","Dustwallow Marsh","Burning Steppes"],"Devilsaur Leather":["Un'Goro Crater"]};
export const KALIMDOR: Set<string> = new Set(["Teldrassil","Durotar","Mulgore","Darkshore","The Barrens","Stonetalon Mountains","Ashenvale","Thousand Needles","Desolace","Dustwallow Marsh","Feralas","Tanaris","Azshara","Felwood","Un'Goro Crater","Winterspring","Silithus","Shen'dralas","Mount Hyjal"]);
// Peak node counts per zone in a single skill bracket, from Wowhead's Forever data via Kami-labs
export const DENSITY: Record<string, Record<string, number>> = {herb:{"Teldrassil":481,"Zephras Isle":461,"Elwynn Forest":372,"Dun Morogh":367,"Westfall":275,"Redridge Mountains":229,"Wetlands":388,"Darkshore":202,"Ashenvale":330,"Stonetalon Mountains":309,"Stranglethorn Vale":469,"Dustwallow Marsh":310,"Arathi Highlands":267,"Swamp of Sorrows":274,"Feralas":264,"Alterac Mountains":177,"The Hinterlands":162,"Azshara":228,"Eastern Plaguelands":333,"Felwood":228,"Un'Goro Crater":182},
 ore:{"Zephras Isle":230,"Dun Morogh":220,"Elwynn Forest":219,"Loch Modan":151,"Redridge Mountains":271,"Thousand Needles":314,"Hillsbrad Foothills":198,"Arathi Highlands":351,"Desolace":245,"Stranglethorn Vale":275,"Badlands":271,"The Hinterlands":293,"Tanaris":255,"Burning Steppes":290,"Searing Gorge":227,"Silithus":273,"Winterspring":227,"Un'Goro Crater":187}};
