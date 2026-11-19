// Character helpers: professions, training ranks, auction cuts, skill colors, gold per hour
import { MAT } from "../data/materials";
import { SMELT, GATHER_RATE } from "../data/gathering";
import { RANKS, PATHS, type Bracket } from "../data/professions";
import { HOUSES } from "../data/consumables";
import { whereGather } from "./farm";
import type { Character } from "./types";

export type Need = { prof: string; name: string; bracket: Bracket; next: Bracket|undefined;
  farm: ReturnType<typeof canGather> };

export function profOf(c: Character,n: string){return c.profs.find(p=>p.name===n)}
export function canGather(c: Character,name: string): { prof: string; zones: string[]; smelt?: string[] }|null{ // can this character gather it in their zones at their skill?
  const m=MAT[name];if(m&&m.gather){const p=profOf(c,m.gather);if(!p||p.skill<(m.req as number))return null;const w=whereGather(name,m.gather,c);return w.zones.length?{prof:m.gather,zones:w.zones}:null}
  const ores=SMELT[name];if(ores){const p=profOf(c,"Mining");if(!p)return null;
    const ok=ores.every(o=>MAT[o]&&p.skill>=(MAT[o].req as number)&&whereGather(o,"Mining",c).zones.length);return ok?{prof:"Mining",zones:whereGather(ores[0],"Mining",c).zones,smelt:ores}:null}
  return null;
}
export function rankBlock(c: Character,p: { name: string; skill: number }): { msg: string; blocked?: boolean }|null{
  const r=RANKS.find(x=>p.skill<x.cap)||RANKS[3];
  const next=RANKS[RANKS.indexOf(r)+1];
  if(p.skill>=r.cap-5&&next){
    if(c.level<next.lvl)return{msg:`You'll hit the ${r.cap} cap soon. ${next.name} training needs level ${next.lvl} (you're ${c.level}).`,blocked:true};
    return{msg:`Train ${next.name} soon: you're near the ${r.cap} cap.`};
  }
  return null;
}
export function houseOf(c: Character): string{return c.faction==="Alliance"?"Alliance":"Horde"}
export function cutFor(house: string): number{return (HOUSES[house]||HOUSES.Horde).cut}
export function skillColor(skill: number,req: number): [string, string]{if(skill<req)return["locked","c-gray"];const d=skill-req;if(d<25)return["orange","c-orange"];if(d<50)return["yellow","c-yellow"];if(d<100)return["green","c-green"];return["gray","c-gray"]}
export function perHour(o: { prof: string; est: { now: number }|null|undefined },c: Character): number|null{const r=GATHER_RATE[o.prof];if(!r||!o.est)return null;const cut=cutFor(houseOf(c));return Math.round(r.nodes*r.yield*o.est.now*(1-cut))}
export function needsFor(c: Character): Need[]{ // materials for profession skill-ups in the current bracket
  const out: Need[]=[];
  for(const p of c.profs){const path=PATHS[p.name];if(!path)continue;
    const b=path.find(x=>p.skill>=x[0]&&p.skill<x[1])||path[path.length-1];
    const nb=path[path.indexOf(b)+1];
    for(const n of b[2])out.push({prof:p.name,name:n,bracket:b,next:nb,farm:canGather(c,n)});}
  return out;
}
