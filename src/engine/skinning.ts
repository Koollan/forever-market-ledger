// Skinning: skill needed per beast level, and how each mapped spot works for a character
import { SKIN_SPOTS, type SkinSpot } from "../data/skinSpots";
import { reachZones } from "./farm";
import { profOf, skillColor } from "./character";
import { andList } from "./util";
import type { Character } from "./types";

export type SkinPlan = { sp: SkinSpot; lvl?: number; col: [string, string]; lo?: number; hi?: number; score?: number; lockedAt?: number };

export const skinReq=(l: number)=>l<=10?1:l<=20?(l-10)*10:l*5; // Classic: skill needed to skin a beast of level l
export function skinPlan(c: Character,sp: SkinSpot): SkinPlan|null{ // how this spot works for this character, or null if it doesn't
  const p=profOf(c,"Skinning");if(!p)return null;const reach=c.level+3;
  if(sp.min>reach)return null; // beasts too strong to farm
  const top=Math.min(sp.max,reach);
  let best: number|null=null;for(let l=top;l>=sp.min;l--){if(skinReq(l)<=p.skill){best=l;break}}
  if(best==null)return{sp,lockedAt:skinReq(sp.min),col:["locked","c-gray"]};
  const col=skillColor(p.skill,skinReq(best));
  return{sp,lvl:best,col,lo:sp.min,hi:top,score:(col[0]==="orange"?3:col[0]==="yellow"?2:col[0]==="green"?1:0)*100+best};
}
export function skinSpots(c: Character): SkinPlan[]{
  const zs=new Set(reachZones(c).map(z=>z.name));
  return SKIN_SPOTS.filter(sp=>zs.has(sp.zone)).map(sp=>skinPlan(c,sp)).filter((x): x is SkinPlan=>!!x&&!x.lockedAt).sort((a,b)=>(b.score as number)-(a.score as number));
}
export const skinLine=(x: SkinPlan)=>`Skin ${x.sp.beasts} (about level ${x.lo}–${x.hi}) around ${andList(x.sp.spots)} for ${x.sp.leather} Leather. ${x.col[0]==="gray"?"No skill-ups for you here.":x.col[0]==="green"?"A few skill-ups left.":"Good skill-ups for you."}`;
