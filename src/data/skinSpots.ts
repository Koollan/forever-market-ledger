// Where to skin: beasts, levels and subzones (Classic spawns via RankedBoost; Forever may differ)
export type SkinSpot = { zone: string; min: number; max: number; beasts: string; spots: string[]; leather: string };
type SkinRow = [string, number, number, string, string[], string];

export const SKIN_SPOTS: SkinSpot[] = ([
 ["Durotar",5,9,"Elder and Dire Mottled Boars, Clattering and Armored Scorpids",["Razormane Grounds","Thunder Ridge","Razor Hill"],"Light"],
 ["Mulgore",5,10,"Prairie Stalkers, Prairie Wolves, Flatland Prowlers and Prairie Wolf Alphas",["The Golden Plains","Bloodhoof Village","Thunder Bluff"],"Light"],
 ["Tirisfal Glades",3,11,"Duskbats and Worgs",["Brightwater Lake","Nightmare Vale","Balnir Farmstead"],"Light"],
 ["Dun Morogh",5,8,"Elder and Crag Boars, Snow Leopards and Ice Claw Bears",["Kharanos","The Grizzled Den","Iceflow Lake"],"Light"],
 ["Elwynn Forest",5,10,"Rockhide Boars, Mangy Wolves, Prowlers and Gray Forest Wolves",["Fargodeep Mine","Jerod's Landing","Tower of Azora"],"Light"],
 ["Darkshore",10,14,"Rabid and Thistle Bears, Foreststrider Fledglings and Moonstalker Runts",["Cliffspring River","Ameth'Aran","Bashal'Aran"],"Light"],
 ["The Barrens",15,18,"Hecklefang Hyenas, Ornery Plainstriders, Sunscale Scytheclaws and Barrens Giraffes",["Agama'gor","Lushwater Oasis","Bramblescar"],"Light and Medium"],
 ["Loch Modan",16,20,"Black Bear Patriarchs, Young Threshadons and Elder Mountain Boars",["The Farstrider Lodge","The Loch","Mo'grosh Stronghold"],"Medium"],
 ["Westfall",16,17,"Great Goretusks",["The Dead Acre","Sentinel Hill","The Dust Plains"],"Medium"],
 ["Darkshore",14,19,"Giant Foreststriders, Foreststriders, Elder Darkshore Threshers and Moonstalker Sires",["The Master's Glaive","Grove of the Ancients","Remtravel's Excavation"],"Light and Medium"],
 ["The Barrens",20,23,"Thunderheads, Stormhides, Hecklefang Stalkers and Zhevra Coursers",["Field of Giants","Blackthorn Ridge","Camp Taurajo"],"Medium and Heavy"],
 ["Hillsbrad Foothills",21,26,"Elder, Vicious and Gray Bears and Starving Mountain Lions",["Southshore","Hillsbrad Fields","Durnholde Keep"],"Medium and Heavy"],
 ["Ashenvale",21,27,"Ashenvale Bears, Elder Ashenvale Bears and Shadowhorn Stags",["Mystral Lake","Night Run","Raynewood Retreat"],"Medium and Heavy"],
 ["Wetlands",21,28,"Wetlands Crocolisks, Highland Razormaws and Mottled Raptors",["Saltspray Glen","Black Channel Marsh","Whelgar's Excavation Site"],"Medium and Heavy"],
 ["Thousand Needles",30,35,"Saltstone Crystalhides, Scorpid Reavers and Sparkleshell Snappers and Tortoises",["The Shimmering Flats"],"Heavy"],
 ["Arathi Highlands",30,37,"Highland Striders and Thrashers, Giant Plains Creepers and Highland Fleshstalkers",["Boulder'gor","Refuge Pointe","Circle of Inner Binding"],"Heavy and Thick"],
 ["Desolace",30,36,"Gritjaw Basilisks, Raging Thunder Lizards and Scorpashi Snappers",["Kodo Graveyard","Sargeron","Thunder Axe Fortress"],"Heavy and Thick"],
 ["Stranglethorn Vale",37,41,"Shadowmaw Panthers, Stranglethorn Tigresses and Jungle Stalkers and Thunderers",["Gurubashi Arena","Lake Nazferiti","Balia'mah Ruins"],"Heavy and Thick"],
 ["Dustwallow Marsh",37,41,"Drywallow Daggermaws, Crocolisks and Snappers and Young Murk Threshers",["The Quagmire","Beezil's Wreck","Tidefury Cove"],"Heavy and Thick"],
 ["Dustwallow Marsh",39,43,"Drywallow Daggermaws, Bloodfen Lashtails and Murk Threshers",["Wyrmbog","Tidefury Cove","Sentry Point"],"Thick"],
 ["Feralas",40,50,"Longtooth Runners and Howlers, Ironfur Bears and Groddoc Thunderers",["The Twin Colossals","Ruins of Isildien","Lower Wilds"],"Thick and Rugged"],
 ["The Hinterlands",41,50,"Saltwater Snapjaws, Silvermane Stalkers and Wolves and Mangy Silvermanes",["Shaol'watha","The Overlook Cliffs","Hiri'watha"],"Thick and Rugged"],
 ["Tanaris",44,50,"Blisterpaw Hyenas, Glasshide Gazers, Surf Gliders and Scorpid Dunestalkers",["Abyssal Sands","Southbreak Shore","Dunemaul Compound"],"Thick and Rugged"],
 ["Stranglethorn Vale",40,50,"Jungle Stalkers, Elder Mistvale and Skymane Gorillas and Ironjaw Basilisks",["Mistvale Valley","Gurubashi Arena","Jaguero Isle"],"Thick and Rugged"],
 ["Azshara",50,54,"Mosshoof Coursers, Thunderhead Skystormers and Coralshell Lurkers",["Lake Mennar","Legashi Encampment","Thalassian Base Camp"],"Rugged"],
 ["Un'Goro Crater",50,55,"Pterrordaxes, Frenzied Pterrordaxes and Diemetradons",["Golakka Hot Springs","Terror Run","Fire Plume Ridge"],"Rugged"],
 ["Western Plaguelands",51,56,"Diseased Grizzlies, Wolves and Black Bears",["Dalson's Tears","Gahrron's Withering","Northridge Lumber Camp"],"Rugged"],
 ["Burning Steppes",51,57,"Deathlash, Venomtip and Firetail Scorpids and Ember Worgs",["Terror Wing Path","The Pillar of Ash","Draco'dar"],"Rugged"],
 ["Eastern Plaguelands",53,60,"Plaguebats and Plagued Swine",["Blackwood Lake","Pestilent Scar","The Fungal Vale"],"Rugged"],
 ["Winterspring",55,60,"Shardtooth Maulers, Frostsaber Stalkers and Chillwind Ravagers",["Frostsaber Rock","Everlook","The Hidden Grove"],"Rugged"]
] as SkinRow[]).map(([zone,min,max,beasts,spots,leather])=>({zone,min,max,beasts,spots,leather}));
