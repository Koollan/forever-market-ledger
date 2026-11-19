// Zone dossiers: when, where and why to farm a zone, for one character at one moment
// @ts-nocheck: the dossier's text-building code is typed loosely until the UI split (step 11)
import { ZONE, KALIMDOR, DENSITY } from "../data/zones";
import { MAT } from "../data/materials";
import { SKIN_SPOTS } from "../data/skinSpots";
import { ctxAt, windows, type Toggles } from "./conditions";
import { skinPlan, skinLine } from "./skinning";
import { profOf, perHour, needsFor } from "./character";
import { SMELT } from "../data/gathering";
import { andList, pct, plainMoney, whenTxt } from "./util";
import type { Character } from "./types";

export const continentOf=(n: string)=>n==="Zephras Isle"?"Skywall (Skyborne start)":KALIMDOR.has(n)?"Kalimdor":"Eastern Kingdoms";
export function zoneDossier(c: Character,Zr: any,now: number,toggles: Toggles): any{
  const z=ZONE[Zr.zone];const tg=toggles;const ctx=ctxAt(now,tg);
  const when=[],where=[],why=[];
  // WHEN
  if(c.level<z.min)when.push(`Stretch zone: it starts at level ${z.min} and you're ${c.level}. Mobs will be tougher than you, so stick to the edges.`);
  else if(c.level<=z.max)when.push(`Now. Level ${z.min}–${z.max} fits you, so you can quest here while you gather.`);
  else when.push(`You've outleveled it (${z.min}–${z.max}), so mobs mostly ignore you and loops are fast.`);
  const ups=Zr.items.filter(o=>o.skillUp);
  if(ups.length){for(const pn of [...new Set(ups.map(o=>o.prof))]){const u=ups.filter(o=>o.prof===pn);const lim=Math.max(...u.map(o=>o.req+50));const p=profOf(c,pn);
    when.push(`${pn} skill-ups from ${andList(u.map(o=>o.name))} until about ${lim} (you're at ${p.skill}).`)}}
  else when.push("Nothing here gives skill-ups any more, so it's purely for gold.");
  const crowded=z.min<=ctx.front+3&&z.max>=ctx.front-3;
  if(crowded)when.push(`Busy right now: most players are leveling around ${Math.round(ctx.front)}. Go early morning or on weekdays for untouched nodes.`);
  else if(z.max<ctx.front-8)when.push("Quiet: most players have moved past this zone, so nodes stay up. Any time works.");
  else when.push(ctx.weekend?"Weekends bring more farmers; weekday evenings are calmer.":"Normal traffic; any time works.");
  const priced=Zr.items.filter(o=>o.est);
  if(priced.length){const best=priced.map(o=>({o,w:windows(MAT[o.name],tg,"sell",168,now)})).sort((a,b)=>b.w.best.s/b.w.now-a.w.best.s/a.w.now)[0];
    const g=best.w.best.s/best.w.now-1;
    when.push(g>0.05?`Sell what you gather at ${whenTxt(best.w.best.t,now)} (${best.o.name} ${pct(g)} vs now).`:"Sell when you're back: prices won't improve much this week.");}
  // WHERE
  where.push(`${continentOf(z.name)}${z.f==="C"?", contested territory: watch for the other faction on PvP realms":", your faction's territory"}.`);
  const hd=DENSITY.herb[z.name],od=DENSITY.ore[z.name];
  const dens=[];if(hd&&Zr.items.some(o=>o.prof==="Herbalism"))dens.push(`≈${hd} herb nodes`);if(od&&Zr.items.some(o=>o.prof==="Mining"))dens.push(`≈${od} ore nodes`);
  if(dens.length)where.push(`Dense: ${dens.join(" and ")} in its best bracket, among the top zones in Wowhead's Forever data.`);
  if(z.est)where.push("New Forever zone: its nodes aren't charted yet, so this list is a best guess for its level.");
  if(profOf(c,"Skinning")){
    const sp=SKIN_SPOTS.filter(x=>x.zone===z.name).map(x=>skinPlan(c,x)).filter(Boolean);
    const ok=sp.filter(x=>!x.lockedAt).sort((a,b)=>b.score-a.score);
    if(ok.length)where.push(skinLine(ok[0]));
    else if(sp.length)where.push(`Skinning: the main beasts here (${sp[0].sp.beasts}) need about ${sp[0].lockedAt} skill.`);
    else if(Zr.items.some(o=>o.prof==="Skinning"))where.push(`Skinnable beasts here run about level ${z.min}–${z.max}. No mapped hotspots for this zone, so skin what you kill on your route.`);
  }
  // WHY
  if(ups.length)why.push(`${ups.length} node type${ups.length===1?"":"s"} still give skill-ups.`);
  const profsHere=[...new Set(Zr.items.map(o=>o.prof))];
  if(profsHere.length>1)why.push(`Both your gathering professions work here (${andList(profsHere)}), so nothing you pass is wasted.`);
  const needs=needsFor(c).filter(n=>Zr.items.some(o=>o.name===n.name||(SMELT[n.name]||[]).includes(o.name)));
  if(needs.length)why.push(`Feeds your ${andList([...new Set(needs.map(n=>n.prof))])}: ${andList([...new Set(needs.map(n=>n.name))])}.`);
  if(priced.length){const top=priced.sort((a,b)=>b.est.now-a.est.now)[0];const ph=perHour(top,c);
    why.push(`${top.name} is worth about ${plainMoney(top.est.now)} each today${ph?`, roughly ${plainMoney(ph)} an hour if you gathered only that`:""}.`);}
  else why.push("Add prices for what grows here to see what it's worth.");
  const up=Zr.items.filter(o=>o.shift>1.03).map(o=>o.name);if(up.length)why.push(`Today's conditions push ${andList(up)} up.`);
  return{when,where,why};
}
