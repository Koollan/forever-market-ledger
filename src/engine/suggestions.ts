// Suggestions: what to farm, sell, hold, buy and train, and timed session plans.
// Pure: every function takes the character and a context of {now, items, toggles, market?}.
// With API prices (market, T3), estimates use them; without, every output is as before.
import { MAT } from "../data/materials";
import { GATHER, GATHER_RATE } from "../data/gathering";
import { SKIN_SPOTS } from "../data/skinSpots";
import { shiftAt, ctxAt, windows, type Toggles } from "./conditions";
import { estimate } from "./estimate";
import { zl, whereGather, budgetOf } from "./farm";
import { profOf, skillColor, rankBlock, needsFor, perHour } from "./character";
import { skinPlan } from "./skinning";
import { andList, pct, plainMoney, whenTxt } from "./util";
import type { Character, Items } from "./types";
import { apiRow, homeSeries, type Market } from "./market";
import { processAdviceFrom } from "./process";

export type SugCtx = { now: number; items: Items; toggles: Toggles; market?: Market | null };
const apiCtx=(c: Character,x: SugCtx)=>({market:x.market??null,character:c});
export type Suggestion = { kind: string; title: string; body: string };

// Worked out once per (context, character): todaySuggestions and sessionPlan reach it through bestFarm and
// sellAdvice with the same context. Callers only read the result.
const gatherMemo=new WeakMap<SugCtx,WeakMap<Character,any[]>>();
export function gatherOptions(c: Character,x: SugCtx): any[]{
  let byChar=gatherMemo.get(x);if(!byChar){byChar=new WeakMap();gatherMemo.set(x,byChar)}
  let opts=byChar.get(c);if(!opts){opts=gatherOptionsUncached(c,x);byChar.set(c,opts)}
  return opts;
}
function gatherOptionsUncached(c: Character,x: SugCtx): any[]{
  const out=[];const tg=x.toggles;
  for(const p of c.profs){
    if(!GATHER[p.name])continue;
    for(const [n,req] of GATHER[p.name]){
      if(p.skill<req)continue;const w=whereGather(n,p.name,c);if(!w.zones.length)continue;
      const col=skillColor(p.skill,req);const e=estimate(n,x.items,tg,x.now,apiCtx(c,x));const m=MAT[n];
      const s=shiftAt(m,x.now,tg);
      out.push({prof:p.name,name:n,req,zones:w.zones,col:col[0],colCls:col[1],est:e,shift:s.mult,why:s.why,
        skillUp:col[0]==="orange"?2:col[0]==="yellow"?1:0});
    }
  }
  return out;
}
export function bestFarm(c: Character,x: SugCtx): { top: any; list: any[]; opts: any[] }|null{
  const opts=gatherOptions(c,x);if(!opts.length)return null;
  // score zones by skill-ups and known value of what grows there
  const zones: Record<string, any>={};
  for(const o of opts)for(const z of o.zones){
    const Z=zones[z]||(zones[z]={zone:z,items:[],score:0});
    Z.items.push(o);Z.score+=o.skillUp*3+(o.est?Math.log10(1+o.est.now)*1.5:0)+(o.shift-1)*10;
  }
  // skinners: weight zones by their mapped beast spots
  if(profOf(c,"Skinning"))for(const Z of Object.values(zones)){
    const sp=SKIN_SPOTS.filter(x=>x.zone===Z.zone).map(x=>skinPlan(c,x)).filter(Boolean) as any[];if(!sp.length)continue;
    const ok=sp.filter(x=>!x.lockedAt).sort((a,b)=>b.score-a.score)[0];
    if(ok)Z.score+=({orange:6,yellow:3,green:1} as Record<string, number>)[ok.col[0]]||0;else Z.score-=4;
  }
  const list=Object.values(zones).sort((a,b)=>b.score-a.score);
  return{top:list[0],list,opts};
}


// What the character holds: what you priced, plus what you gather that has an API price
export function heldNames(c: Character,x: SugCtx): string[]{
  const series=homeSeries(c);
  const gathered=x.market&&series?gatherOptions(c,x).map(o=>o.name).filter(n=>apiRow(n,series,x.market as Market)):[];
  return [...new Set([...Object.values(x.items).map(i=>i.name),...gathered])];
}
// Process or sell (T8): the best route worth processing for each material held
export function processAdvice(c: Character,x: SugCtx){return processAdviceFrom(heldNames(c,x),c,x)}
export function sellAdvice(c: Character,x: SugCtx): any[]{
  const tg=x.toggles;const res=[];
  for(const n of heldNames(c,x)){const m=MAT[n]||{name:n,cat:"Other",tier:3};const e=estimate(n,x.items,tg,x.now,apiCtx(c,x));if(!e)continue;
    const w=windows(m,tg,"sell",168,x.now);const gain=w.best.s/w.now-1;
    res.push({name:n,est:e,now:w.now,best:w.best,gain,action:gain>0.05?"hold":"list"});}
  return res.sort((a,b)=>b.gain-a.gain);
}
export function todaySuggestions(c: Character,x: SugCtx): Suggestion[]{
  const tg=x.toggles;const s=[];const ctx=ctxAt(x.now,tg);
  const f=bestFarm(c,x);
  if(f&&f.top){const it=f.top.items.slice().sort((a: any,b: any)=>b.skillUp-a.skillUp||((b.est?.now||0)-(a.est?.now||0))).slice(0,3);
    const ups=it.filter((x: any)=>x.skillUp).map((x: any)=>x.name);
    s.push({kind:"Farm",title:`Gather in ${zl(f.top.zone)}`,body:`${it.map((x: any)=>x.name).join(", ")}${ups.length?`. ${andList(ups)} still give${ups.length===1?"s":""} skill-ups`:""}.${ctx.weekend?" Weekend prices for raw materials run low, so hold what you gather until Tuesday to Thursday.":""}`});}
  const sa=sellAdvice(c,x);const listNow=sa.filter(x=>x.action==="list").slice(0,3),hold=sa.filter(x=>x.action==="hold").slice(0,2);
  if(listNow.length)s.push({kind:"Sell",title:"List now",body:listNow.map(x=>`${x.name} at about ${plainMoney(x.est.now)}`).join(", ")+". Conditions won't get meaningfully better this week."});
  if(hold.length)s.push({kind:"Hold",title:"Hold for a better window",body:hold.map(x=>`${x.name}: ${pct(x.gain)} at ${whenTxt(x.best.t,x.now)}`).join("; ")+"."});
  const needs=needsFor(c).filter(n=>!n.farm);
  if(needs.length){const n=needs[0];const m=MAT[n.name]||{name:n.name,cat:"Other",tier:3};const w=windows(m,tg,"buy",168,x.now);
    s.push({kind:"Buy",title:`Buy ${n.name} for ${n.prof}`,body:`You can't gather it in your zones yet. ${w.best.s<w.now-0.02?`Cheapest window this week: ${whenTxt(w.best.t,x.now)} (${pct(w.best.s/w.now-1)} vs now).`:"Now is as good as any time this week."} Keep it within your ${plainMoney(budgetOf(c))} budget.`});}
  for(const p of c.profs){const rb=rankBlock(c,p);if(rb){s.push({kind:rb.blocked?"Level":"Train",title:`${p.name} ${p.skill}`,body:rb.msg});break}}
  if(!c.profs.length)s.push({kind:"Tip",title:"Pick up a gathering profession",body:"Herbalism or Skinning pay from level 1 and feed everything else in this app."});
  return s;
}
export function sessionPlan(c: Character,mins: number,x: SugCtx): { m: number; t: string; b: string }[]{
  const tg=x.toggles;const steps=[];const f=bestFarm(c,x);const sa=sellAdvice(c,x);
  const listNow=sa.filter(x=>x.action==="list");const needs=needsFor(c);
  const craft=needs.filter(n=>!["Herbalism","Skinning","Mining"].includes(n.prof));
  let left=mins;
  if(listNow.length&&left>=20){steps.push({m:5,t:"Auction house",b:`List ${listNow.slice(0,4).map(x=>x.name).join(", ")}. Prices are at or near their best for the week.`});left-=5}
  if(f&&f.top){
    const share=mins<=30?left:craft.length?Math.round(left*0.7):left;
    const top=f.top.items.slice().sort((a: any,b: any)=>b.skillUp-a.skillUp||((b.est?.now||0)-(a.est?.now||0)));
    const lead=top[0];const ph=perHour(lead,c);const units=GATHER_RATE[lead.prof]?Math.round(GATHER_RATE[lead.prof].nodes*GATHER_RATE[lead.prof].yield*share/60):null;
    steps.push({m:share,t:`Gather in ${zl(f.top.zone)}`,b:`Loop for ${top.slice(0,3).map((x: any)=>x.name).join(", ")}.${units?` Expect roughly ${units} ${({Herbalism:"herbs",Skinning:"skins",Mining:"ore"} as Record<string, string>)[lead.prof]}${ph?`, worth about ${plainMoney(ph*share/60)} if they were all ${lead.name}`:""}.`:""}${lead.skillUp?" Skill-ups on the way.":""}`});
    left-=share;
  }
  if(craft.length&&left>=10){const n=craft[0];steps.push({m:left,t:`Level ${n.prof}`,b:`Spend ${n.bracket[2].join(" and ")} on ${n.prof} skill-ups (${n.bracket[0]}-${n.bracket[1]}).${n.farm?" You can gather these yourself.":" Buy them in a cheap window if you're short."}`});left=0}
  if(left>=10)steps.push({m:left,t:"Quest and skin as you go",b:"Spend the rest leveling. Gather every node and skinnable mob on your route."});
  if(!steps.length)steps.push({m:mins,t:"Level up",b:"Add professions to your character to get a tailored plan."});
  return steps;
}


