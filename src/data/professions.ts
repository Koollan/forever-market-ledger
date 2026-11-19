// Profession training ranks and crafting material paths
export type Rank = { cap: number; name: string; lvl: number; skill: number };
export type Bracket = [lo: number, hi: number, mats: string[]];

export const RANKS: Rank[] = [{cap:75,name:"Apprentice",lvl:5,skill:0},{cap:150,name:"Journeyman",lvl:10,skill:50},{cap:225,name:"Expert",lvl:20,skill:125},{cap:300,name:"Artisan",lvl:35,skill:200}];
export const PATHS: Record<string, Bracket[]> = { // materials needed by skill bracket (Classic paths; Forever may differ)
 Alchemy:[[1,60,["Peacebloom","Silverleaf"]],[60,110,["Briarthorn","Mageroyal"]],[110,140,["Bruiseweed","Briarthorn"]],[140,185,["Kingsblood","Liferoot"]],[185,230,["Goldthorn","Khadgar's Whisker"]],[230,265,["Sungrass","Khadgar's Whisker"]],[265,300,["Dreamfoil","Golden Sansam","Mountain Silversage"]]],
 Leatherworking:[[1,100,["Light Leather"]],[100,150,["Medium Leather"]],[150,200,["Heavy Leather"]],[200,250,["Thick Leather"]],[250,300,["Rugged Leather"]]],
 Tailoring:[[1,75,["Linen Cloth"]],[75,125,["Wool Cloth"]],[125,175,["Silk Cloth"]],[175,250,["Mageweave Cloth"]],[250,300,["Runecloth"]]],
 "First Aid":[[1,80,["Linen Cloth"]],[80,150,["Wool Cloth"]],[150,210,["Silk Cloth"]],[210,260,["Mageweave Cloth"]],[260,300,["Runecloth"]]],
 Blacksmithing:[[1,75,["Copper Bar","Rough Stone"]],[75,125,["Bronze Bar","Coarse Stone"]],[125,150,["Iron Bar","Heavy Stone"]],[150,200,["Steel Bar","Iron Bar"]],[200,250,["Mithril Bar","Solid Stone"]],[250,300,["Thorium Bar","Dense Stone"]]],
 Engineering:[[1,75,["Copper Bar","Rough Stone"]],[75,125,["Bronze Bar","Coarse Stone"]],[125,175,["Iron Bar","Heavy Stone","Silk Cloth"]],[175,250,["Mithril Bar","Solid Stone"]],[250,300,["Thorium Bar","Dense Stone","Runecloth"]]],
 Enchanting:[[1,130,["Strange Dust","Lesser Magic Essence"]],[130,180,["Soul Dust","Greater Magic Essence"]],[180,230,["Vision Dust","Lesser Mystic Essence"]],[230,270,["Dream Dust","Lesser Nether Essence"]],[270,300,["Illusion Dust","Greater Eternal Essence"]]]
};
