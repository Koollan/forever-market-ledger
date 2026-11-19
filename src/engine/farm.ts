// Where a character can farm: zone reach, gathering locations, and the budget estimate
import { ZONES, ZONE, STONE_OF, LEATHER_TIERS, SKIN_SPECIAL, type Zone } from "../data/zones";
import type { Character } from "./types";

export const zl=(n: string)=>ZONE[n]?.est?n+" (est.)":n; // new Forever zones whose nodes aren't charted yet
/* Typical spendable gold by level when the player hasn't entered their own (copper) */
export function estBudget(l: number): number{return l<10?5000:l<20?40000:l<30?200000:l<40?600000:l<50?1500000:l<60?3000000:6000000}
export function budgetOf(c: Character): number{return c.gold!=null&&c.gold>=0?c.gold:estBudget(c.level)}
export function reachZones(c: Character): Zone[]{const f=c.faction==="Alliance"?"A":"H";const s=c.stretch??2;return ZONES.filter(z=>(z.f==="C"||z.f===f)&&z.min<=c.level+s&&(!z.skyborne||c.skyborne))}
/* Where can this character gather an item? -> {zones:[names], unlock:level|null} */
export function whereGather(name: string,prof: string,c: Character): { zones: string[]; unlock: number|null }{
  const zs=reachZones(c),f=c.faction==="Alliance"?"A":"H",s=c.stretch??2;
  const all=ZONES.filter(z=>(z.f==="C"||z.f===f)&&(!z.skyborne||c.skyborne));
  let has: (z: Zone)=>boolean;
  if(prof==="Herbalism")has=z=>z.herbs.includes(name);
  else if(prof==="Mining"){const ore=STONE_OF[name]||name;has=z=>z.ores.includes(ore)}
  else if(prof==="Skinning"){
    if(SKIN_SPECIAL[name])has=z=>SKIN_SPECIAL[name].includes(z.name);
    else{const tier: [string, number, number]|undefined=name==="Ruined Leather Scraps"?LEATHER_TIERS[0]:LEATHER_TIERS.find(t=>name.startsWith(t[0]+" "));
      if(!tier)return{zones:[],unlock:null};
      // a mob tier is reachable if the zone overlaps it and those mobs are within the character's kill range
      has=z=>z.min<=tier[2]&&z.max>=tier[1]&&tier[1]<=c.level+s;
      const inZone=(z: Zone)=>z.min<=tier[2]&&z.max>=tier[1];
      const ok=zs.filter(has).map(z=>z.name);
      const lv=all.filter(inZone).map(z=>Math.max(z.min,tier[1]));
      return{zones:ok,unlock:ok.length?null:(lv.length?Math.max(1,Math.min(...lv)-s):null)};}
  } else return{zones:[],unlock:null};
  const ok=zs.filter(has).map(z=>z.name);
  const lock=all.filter(has).map(z=>prof==="Skinning"&&!SKIN_SPECIAL[name]?Math.max(z.min,(LEATHER_TIERS.find(t=>name.startsWith(t[0]+" "))||["",1,1])[1]):z.min);
  return{zones:ok,unlock:ok.length?null:(lock.length?Math.max(1,Math.min(...lock)-s):null)};
}
