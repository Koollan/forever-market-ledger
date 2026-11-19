// Conditions engine: rule-based price shifts. Pure: every function takes the time it is asked about.
// Uses the device-local day and hour, as the app always has (realm time is task T7).
import { LAUNCH, tierOfLevel, RAW, CONSUME } from "../data/materials";

export type Toggles = Record<string, unknown>;
export type Mat = { name: string; cat: string; tier: number };
export type Ctx = { t: number; day: number; h: number; days: number; front: number; frontTier: number; weekend: boolean;
  midweek: boolean; raidPrep: boolean; prime: boolean; offpeak: boolean; endgame: boolean; toggles: Toggles };
export type Why = { p: number; why: string; id: string };
export type Rule = { id: string; when?: (c: Ctx) => boolean; label: (c: Ctx) => string; act: string;
  hit: (m: Mat, c: Ctx) => { p: number; why: string } | null };
export type Shift = { mult: number; why: Why[]; ctx: Ctx };
export type Slot = { t: number; s: number };
export type Windows = { now: number; best: Slot };

export function frontLevel(t: number): number{const d=Math.max(0,(t-LAUNCH)/864e5);return Math.min(60,8+52*(1-Math.exp(-d/25)))}
export function ctxAt(t: number,toggles?: Toggles): Ctx{
  const d=new Date(t);const day=d.getDay(),h=d.getHours();
  const days=Math.max(0,Math.floor((t-LAUNCH)/864e5));
  return{t,day,h,days,front:frontLevel(t),frontTier:tierOfLevel(frontLevel(t)),
    weekend:day===6||day===0||(day===5&&h>=17),midweek:day>=2&&day<=4,
    raidPrep:(day===1&&h>=17)||day===2,prime:h>=18&&h<23,offpeak:h>=3&&h<10,
    endgame:days>=21,toggles:toggles||{}};
}
/* Each rule: when it applies, which materials it moves, by how much, and what to do about it. */
export const RULES: Rule[]=[
 {id:"front",label:(c: Ctx)=>`Most players are around level ${Math.round(c.front)}`,
  act:"Sell what the crowd is leveling into; buy what they've moved past.",
  hit:(m: Mat,c: Ctx)=>{const g=m.tier-c.frontTier;
    if(g===0)return{p:12,why:"most players are leveling through this bracket now"};
    if(g===1)return{p:6,why:"the leveling crowd reaches this bracket soon"};
    if(g===-1)return{p:-4,why:"the crowd is moving past this bracket"};
    if(g<=-2)return{p:-12,why:"most players have outleveled this bracket"};
    return null}},
 {id:"endgame",when:(c: Ctx)=>c.endgame,label:()=>"Endgame demand",act:"Level-60 materials sell well; hold them for raid nights.",
  hit:(m: Mat)=>m.tier===6?{p:10,why:"level-60 players buy raid and crafting materials"}:null},
 {id:"weekend",when:(c: Ctx)=>c.weekend,label:()=>"Weekend",act:"Buy raw materials now; sell what you gather Tuesday to Thursday.",
  hit:(m: Mat)=>RAW.has(m.cat)?{p:-7,why:"weekend farmers flood raw materials"}:null},
 {id:"midweek",when:(c: Ctx)=>c.midweek,label:()=>"Midweek",act:"Good days to list raw materials.",
  hit:(m: Mat)=>RAW.has(m.cat)?{p:4,why:"weekday supply is thinner"}:null},
 {id:"raid",when:(c: Ctx)=>c.raidPrep&&c.days>=14,label:()=>"Raid reset prep",act:"List potions, elixirs and endgame materials before Tuesday's reset.",
  hit:(m: Mat)=>CONSUME.has(m.cat)||m.tier===6?{p:10,why:"raiders restock before the reset"}:null},
 {id:"greenhouse",when:(c: Ctx)=>c.days>=30,label:()=>"Greenhouse herbs reaching the market",act:"Sell herbs promptly rather than stockpiling.",
  hit:(m: Mat)=>m.cat==="Herb"?{p:-3,why:"herbalists' greenhouses add steady supply"}:null}
];
export function shiftAt(m: Mat,t: number,toggles?: Toggles,mode?: "sell"|"buy"): Shift{ // mode: "sell" adds listing-exposure effects, "buy" adds quiet-hour discounts
  const c=ctxAt(t,toggles);let mult=1;const why: Why[]=[];
  for(const r of RULES){if(r.when&&!r.when(c))continue;const x=r.hit(m,c);if(x){mult*=1+x.p/100;why.push({p:x.p,why:x.why,id:r.id})}}
  if(mode==="sell"&&c.prime){mult*=1.03;why.push({p:3,why:"prime time: more buyers browsing",id:"prime"})}
  if(mode==="buy"&&c.offpeak){mult*=0.97;why.push({p:-3,why:"quiet hours: overnight undercuts are still up",id:"quiet"})}
  return{mult:Math.max(.6,Math.min(1.6,mult)),why,ctx:c};
}
export function windows(m: Mat,toggles: Toggles|undefined,mode: "sell"|"buy",hours: number,now: number): Windows{ // best and worst 3-hour slots over the next N hours
  const slots: Slot[]=[];
  for(let k=0;k<=hours;k+=3){const t=now+k*36e5;slots.push({t,s:shiftAt(m,t,toggles,mode).mult})}
  const best=slots.reduce((a,b)=>mode==="sell"?(b.s>a.s?b:a):(b.s<a.s?b:a));
  return{now:slots[0].s,best};
}
