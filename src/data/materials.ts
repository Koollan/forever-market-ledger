// The materials catalog: every material the app knows, with category and tier (1–6 by level bracket)
import { GATHER } from "./gathering";
import { ZONES, STONE_OF, LEATHER_TIERS, SKIN_SPECIAL, type Zone } from "./zones";
import { CONSUMABLES } from "./consumables";
export type Material = { name: string; cat: string; tier: number; gather?: string; req?: number; lvl?: number };

export const LAUNCH: number = Date.parse("2026-11-04T00:00:00Z"); // WoW Forever launch
export const tierOfLevel=(l: number)=>Math.max(1,Math.min(6,Math.floor(l/10)+1));
export function zoneTier(pred: (z: Zone)=>boolean): number|null{const z=ZONES.filter(pred);return z.length?tierOfLevel(Math.min(...z.map(x=>x.min))):null}
export const MATS: Material[] = (()=>{
  const m: Material[]=[];const add=(name: string,cat: string,tier: number,extra?: Partial<Material>)=>m.push(Object.assign({name,cat,tier},extra||{}));
  GATHER.Herbalism.forEach(([n,req])=>add(n,"Herb",zoneTier((z: Zone)=>z.herbs.includes(n))||tierOfLevel(req/5),{gather:"Herbalism",req}));
  GATHER.Skinning.forEach(([n,req])=>{const lt=LEATHER_TIERS.findIndex(t=>n.startsWith(t[0]+" "));
    const t=SKIN_SPECIAL[n]?zoneTier((z: Zone)=>SKIN_SPECIAL[n].includes(z.name)):lt>=0?tierOfLevel(LEATHER_TIERS[lt][1]+5):n==="Ruined Leather Scraps"?1:3;
    add(n,/Hide$/.test(n)?"Hide":/Scale/.test(n)?"Scale":"Leather",Math.min(6,t as number),{gather:"Skinning",req})});
  GATHER.Mining.forEach(([n,req])=>{const ore=STONE_OF[n]||n;add(n,/Stone$/.test(n)?"Stone":/Crystal/.test(n)?"Gem":"Ore",zoneTier((z: Zone)=>z.ores.includes(ore))||6,{gather:"Mining",req})});
  ([["Linen Cloth",1],["Wool Cloth",2],["Silk Cloth",3],["Mageweave Cloth",4],["Runecloth",5],["Felcloth",6]] as [string, number][]).forEach(([n,t])=>add(n,"Cloth",t));
  ([["Copper Bar",1],["Bronze Bar",2],["Tin Bar",2],["Silver Bar",2],["Iron Bar",3],["Gold Bar",3],["Steel Bar",3],["Mithril Bar",4],["Truesilver Bar",5],["Thorium Bar",5],["Dark Iron Bar",6],["Arcanite Bar",6]] as [string, number][]).forEach(([n,t])=>add(n,"Bar",t));
  ([["Strange Dust",1],["Lesser Magic Essence",1],["Greater Magic Essence",2],["Lesser Astral Essence",2],["Soul Dust",3],["Greater Astral Essence",3],["Vision Dust",4],["Lesser Mystic Essence",4],["Greater Mystic Essence",4],["Dream Dust",5],["Lesser Nether Essence",5],["Greater Nether Essence",5],["Illusion Dust",6],["Lesser Eternal Essence",6],["Greater Eternal Essence",6],["Small Brilliant Shard",6],["Large Brilliant Shard",6]] as [string, number][]).forEach(([n,t])=>add(n,"Enchanting",t));
  CONSUMABLES.forEach(([n,l])=>add(n,/Potion/.test(n)?"Potion":/Elixir/.test(n)?"Elixir":"Consumable",tierOfLevel(l),{lvl:l}));
  return m;
})();
export const MAT: Record<string, Material> = Object.fromEntries(MATS.map(x=>[x.name,x]));
export const RAW: Set<string> = new Set(["Herb","Leather","Hide","Scale","Ore","Stone","Cloth"]);
export const CONSUME: Set<string> = new Set(["Potion","Elixir","Consumable"]);
// Forever moved healing potions to First Aid, which puts steady extra demand on these herbs
export const FA_HERBS: Set<string> = new Set(["Peacebloom","Silverleaf","Earthroot","Briarthorn","Bruiseweed","Kingsblood","Liferoot","Sungrass","Khadgar's Whisker","Golden Sansam","Mountain Silversage"]);
