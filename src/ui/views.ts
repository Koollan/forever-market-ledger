// The five tabs (Today, Farm, Prices, Professions, Session), the header and the bottom nav
import { CLASSES, PROFS, CONS_TAGS } from "../data/classes";
import { GATHER, SMELT, GATHER_RATE } from "../data/gathering";
import { ZONES, ZONE, STONE_OF, LEATHER_TIERS, SKIN_SPECIAL, KALIMDOR, DENSITY } from "../data/zones";
import { CONSUMABLES, HOUSES } from "../data/consumables";
import { RANKS, PATHS } from "../data/professions";
import { SKIN_SPOTS } from "../data/skinSpots";
import { LAUNCH, MATS, MAT, RAW, CONSUME, FA_HERBS, tierOfLevel, zoneTier } from "../data/materials";
import { keyOf, plainMoney, median, andList, pct, whenTxt as whenTxtAt } from "../engine/util";
import { esc, money } from "./format";
import { frontLevel, ctxAt, RULES, shiftAt, windows as windowsAt } from "../engine/conditions";
import { estimate as estimateAt } from "../engine/estimate";
import { zl, estBudget, budgetOf, reachZones, whereGather } from "../engine/farm";
import { profOf, canGather, needsFor, rankBlock, houseOf, cutFor, skillColor, perHour as perHourOf } from "../engine/character";
import { skinReq, skinPlan, skinSpots, skinLine } from "../engine/skinning";
import { continentOf, zoneDossier as zoneDossierAt } from "../engine/dossier";
import { gatherOptions as gatherOptionsAt, bestFarm as bestFarmAt, sellAdvice as sellAdviceAt, todaySuggestions as todaySuggestionsAt, sessionPlan as sessionPlanAt } from "../engine/suggestions";
import { validateBackup, buildBackup, backupData } from "../engine/backup";
import { $, ago, toast, uid8, cacheLocal, readLocal, windows, whenTxt, perHour, zoneDossier, cx, gatherOptions, bestFarm, sellAdvice, todaySuggestions, sessionPlan, estimate, itemFor, lastPrice, recordPrice, deletePrices, S, char, saveState } from "./state";
import { openSheet, closeSheet, sheetMat, sheetChar, sheetChars, plural, checkImport, cancelImport, applyBackup, showExport, copyBackup } from "./sheets";
import { bindActions } from "./actions";

/* ============ Rendering ============ */
export const ICONS={
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 farm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4-3 7-7 7-12a7 7 0 0 0-14 0c0 5 3 9 7 12z"/><path d="M12 22V10"/><path d="M12 14l-3-3M12 12l3-3"/></svg>',
 prices:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
 skills:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
 plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>'
};
export const TABS=[["today","Today"],["farm","Farm"],["prices","Prices"],["skills","Professions"],["plan","Session"]];
export function renderNav(){$("#nav").innerHTML=TABS.map(([k,l])=>`<button type="button" data-tab="${k}" ${S.tab===k?'aria-current="page"':""}>${ICONS[k]}<span>${l}</span></button>`).join("")}
export function renderHeader(){
  const c=char();$("#charName").textContent=`${c.name} · ${c.level} ${c.cls}`;$("#charDot").style.background=CLASSES[c.cls]?.c||"#888";
  $("#sub").textContent=`${HOUSES[houseOf(c)].label} · budget ${plainMoney(budgetOf(c))}${c.gold==null?" (est.)":""}`;
}
export function banners(c){
  let b="";
  if(c.example)b+=`<div class="banner">This is an example character. Set up yours so every suggestion fits your class, level, zones and professions. <button class="btn small" type="button" data-act="editChar" data-id="${c.id}">Set up character</button></div>`;
  else if(c.gold==null)b+=`<div class="banner">Using a typical budget for level ${c.level}. <button class="btn small" type="button" data-act="editChar" data-id="${c.id}">Set your gold</button></div>`;
  return b;
}
export function render(){
  renderHeader();renderNav();const c=char();
  $("#view").innerHTML=banners(c)+({today:vToday,farm:vFarm,prices:vPrices,skills:vSkills,plan:vPlan}[S.tab])(c);
  $("#view").scrollTop=0;
}
export const KIND_PILL={Farm:"acc",Sell:"good",Hold:"warn",Buy:"acc",Level:"bad",Train:"warn",Tip:""};

export function vToday(c){
  const tg=S.state.toggles;const ctx=ctxAt(Date.now(),tg);
  const sug=todaySuggestions(c);
  // materials this character touches: gatherable or needed for professions
  const mine=new Set([...gatherOptions(c).map(o=>o.name),...needsFor(c).map(n=>n.name),...Object.values(S.items).map(i=>i.name)]);
  const conds=[];
  for(const r of RULES){if(r.when&&!r.when(ctx))continue;
    const hits=[...mine].map(n=>{const m=MAT[n];const x=m&&r.hit(m,ctx);return x?{n,p:x.p}:null}).filter(Boolean);
    if(!hits.length)continue;
    const ps=[...new Set(hits.map(h=>h.p))];
    const fx=ps.length===1?`${pct(ps[0]/100)} on ${andList(hits.slice(0,3).map(h=>h.n))}${hits.length>3?` and ${hits.length-3} more`:""}`
      :ps.sort((a,b)=>b-a).map(p=>`${pct(p/100)} ${andList(hits.filter(h=>h.p===p).slice(0,2).map(h=>h.n))}`).join(", ");
    conds.push({t:r.label(ctx),fx,act:r.act});}
  if(ctx.prime)conds.push({t:"Evening prime time",fx:"about +3% when selling",act:"More buyers are online. A good hour to list."});
  if(ctx.offpeak)conds.push({t:"Quiet hours",fx:"about −3% when buying",act:"Overnight undercuts are still up. A good hour to buy."});
  const shifts=[...mine].map(n=>{const m=MAT[n];if(!m)return null;const s=shiftAt(m,Date.now(),tg);return{n,s,e:estimate(n)}}).filter(Boolean).filter(x=>Math.abs(x.s.mult-1)>=0.02).sort((a,b)=>b.s.mult-a.s.mult);
  return `
  <section class="card">
    <div class="row between"><h2>Conditions now</h2><span class="small muted">Day ${ctx.days} of Forever</span></div>
    <div class="list">${conds.map(x=>`<div class="cond"><span class="t">${esc(x.t)}</span><span class="fx">${esc(x.fx)}</span><span class="act">${esc(x.act)}</span></div>`).join("")||'<div class="empty">Nothing unusual for your materials right now.</div>'}</div>
  </section>
  <section class="card">
    <h2>Do this</h2>
    <div class="list">${sug.map(x=>`<div class="item"><span class="nm">${esc(x.title)}</span><span class="right"><span class="pill ${KIND_PILL[x.kind]||""}">${x.kind}</span></span><span class="meta small">${esc(x.body)}</span></div>`).join("")}</div>
  </section>
  <section class="card">
    <h2>Your materials today</h2>
    <p class="small muted" style="margin:0">How today's conditions push prices for what you gather or need, compared with a normal day.</p>
    <div class="list">${shifts.map(x=>`<button class="item" type="button" data-mat="${esc(x.n)}"><span class="nm">${esc(x.n)}</span><span class="right"><span class="pill ${x.s.mult>1?"good":"bad"}">${pct(x.s.mult-1)}</span>${x.e?`<span class="small muted">≈ ${plainMoney(x.e.now)}</span>`:""}</span><span class="meta small muted">${esc(x.s.why.map(w=>w.why).join("; "))}</span></button>`).join("")||'<div class="empty">No notable shifts for your materials right now.</div>'}</div>
  </section>`;
}

export function vFarm(c){
  const gp=c.profs.filter(p=>GATHER[p.name]);
  if(!gp.length)return `<section class="card"><h2>No gathering professions</h2><p class="small muted" style="margin:0">Add Herbalism, Skinning or Mining to your character to get a farm plan.</p><button class="btn" type="button" data-act="editChar" data-id="${c.id}">Edit character</button></section>`;
  const f=bestFarm(c);const tg=S.state.toggles;
  let h="";
  if(f&&f.list.length){
    const sec=(t,a)=>`<div class="ww"><b>${t}</b><ul>${a.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>`;
    h+=`<section class="card"><h2>Zones for ${esc(c.name)}</h2>
    <p class="small muted" style="margin:0">Ranked by skill-ups first, then by the prices you've entered and today's conditions. Only zones up to level ${c.level+(c.stretch??2)} are included. Tap a zone for when, where and why.</p>
    <div class="list">${f.list.slice(0,6).map((z,i)=>{const d=zoneDossier(c,z);return `<details class="zone" ${i===0?"open":""}>
      <summary><span class="nm">${i+1}. ${esc(zl(z.zone))}</span><span class="small muted">${ZONE[z.zone].min}–${ZONE[z.zone].max}</span>
      <span class="meta small">${z.items.map(o=>`<span class="${o.colCls}">${esc(o.name)}</span>`).join(", ")}</span></summary>
      ${sec("When",d.when)}${sec("Where",d.where)}${sec("Why",d.why)}</details>`}).join("")}</div></section>`;
  }
  for(const p of gp){
    const rows=GATHER[p.name].map(([n,req])=>({n,req,col:skillColor(p.skill,req),w:whereGather(n,p.name,c),e:estimate(n),s:shiftAt(MAT[n],Date.now(),tg)}));
    const next=rows.find(r=>r.req>p.skill);const rb=rankBlock(c,p);
    h+=`<section class="card">
      <div class="row between"><h2>${esc(p.name)}</h2><span class="money">${p.skill}/300</span></div>
      <div class="skillbar"><i style="width:${Math.min(100,p.skill/3)}%"></i></div>
      ${rb?`<div class="banner">${esc(rb.msg)}</div>`:""}
      ${p.name==="Skinning"?(()=>{const ss=skinSpots(c).slice(0,3);return ss.length?`<h3>Where to skin now</h3><div class="list">${ss.map(x=>`<div class="item"><span class="nm">${esc(x.sp.zone)} <span class="small ${x.col[1]}">${x.col[0]}</span></span><span class="right small muted">lvl ${x.lo}–${x.hi}</span><span class="meta small">${esc(x.sp.beasts)} around ${esc(andList(x.sp.spots))}. ${esc(x.sp.leather)} Leather.</span></div>`).join("")}</div><p class="small muted" style="margin:0">Beast spots are from the original game and may differ in Forever.</p>`:""})():""}
      ${next?`<p class="small muted" style="margin:0">Next unlock: ${esc(next.n)} at ${next.req}${next.w.zones.length?"":next.w.unlock?`, in your zones from about level ${next.w.unlock}`:""}.</p>`:""}
      <div class="list">${rows.filter(r=>r.req<=p.skill+50).reverse().map(r=>{
        const usable=p.skill>=r.req&&r.w.zones.length;
        const zt=r.w.zones.length?r.w.zones.slice(0,3).map(zl).join(", ")+(r.w.zones.length>3?` +${r.w.zones.length-3}`:""):r.w.unlock?`Not in your zones until about level ${r.w.unlock}`:"Not in your zones";
        const ph=r.e?perHour({prof:p.name,est:r.e}):null;
        return `<button class="item" type="button" data-mat="${esc(r.n)}" style="${usable?"":"opacity:.6"}">
          <span class="nm">${esc(r.n)} <span class="small ${r.col[1]}">${r.col[0]==="locked"?"needs "+r.req:r.col[0]}</span></span>
          <span class="right">${r.e?money(r.e.now):'<span class="small muted">add price</span>'}${ph?`<span class="small muted">~${plainMoney(ph)}/hr</span>`:""}</span>
          <span class="meta small muted">${esc(zt)}${Math.abs(r.s.mult-1)>=.02?` · today ${pct(r.s.mult-1)}`:""}</span></button>`}).join("")}</div>
    </section>`;
  }
  return h+`<p class="small muted">Node data follows Wowhead's Forever data where published. Zones marked (est.) are new Forever zones whose nodes aren't charted yet, so their herbs and ores are a best guess for their level.</p><p class="small muted">Gold per hour is a rough guide: about ${GATHER_RATE.Herbalism.nodes} herb nodes, ${GATHER_RATE.Skinning.nodes} skins or ${GATHER_RATE.Mining.nodes} mining nodes an hour, after the auction house cut.</p>`;
}

export function vPrices(c){
  const tracked=Object.values(S.items).map(i=>i.name).sort();
  const q=S.q.toLowerCase();
  const relevant=new Set([...gatherOptions(c).map(o=>o.name),...needsFor(c).map(n=>n.name)]);
  const pool=MATS.filter(m=>!tracked.includes(m.name)&&(q?m.name.toLowerCase().includes(q):relevant.has(m.name)));
  const sa=Object.fromEntries(sellAdvice(c).map(x=>[x.name,x]));
  return `
  <section class="card">
    <h2>Your prices</h2>
    <p class="small muted" style="margin:0">Type in a price whenever you see one in game. The app removes the conditions at the time you saw it and re-applies today's, so old prices stay useful.</p>
    <div class="list">${tracked.map(n=>{const e=estimate(n);const x=sa[n];return `<button class="item" type="button" data-mat="${esc(n)}"><span class="nm">${esc(n)}</span><span class="right">${money(e.now)}<span class="small muted">seen ${ago(e.last.t)}</span></span><span class="meta">${x?(x.action==="list"?'<span class="pill good">List now</span>':`<span class="pill warn">Hold: ${pct(x.gain)} ${esc(whenTxt(x.best.t))}</span>`):""}<span class="pill">${e.n} price${e.n===1?"":"s"}</span></span></button>`}).join("")||'<div class="empty">No prices yet. Pick a material below to add one.</div>'}</div>
  </section>
  <section class="card">
    <input id="matQ" placeholder="Find a material" value="${esc(S.q)}" aria-label="Find a material">
    <h3>${q?"Matches":"Relevant to you"}</h3>
    <div class="list">${pool.slice(0,30).map(m=>`<button class="item" type="button" data-mat="${esc(m.name)}"><span class="nm">${esc(m.name)}</span><span class="right"><span class="small muted">add price</span></span><span class="meta small muted">${esc(m.cat)} · tier ${m.tier}</span></button>`).join("")||'<div class="empty">No matches.</div>'}</div>
  </section>`;
}

export function vSkills(c){
  if(!c.profs.length)return `<section class="card"><h2>No professions</h2><button class="btn" type="button" data-act="editChar" data-id="${c.id}">Add professions</button></section>`;
  const tg=S.state.toggles;
  return c.profs.map(p=>{
    const rb=rankBlock(c,p);const path=PATHS[p.name];
    let body="";
    if(GATHER[p.name]){
      const ups=GATHER[p.name].filter(([n,req])=>p.skill>=req&&p.skill-req<50&&whereGather(n,p.name,c).zones.length);
      const next=GATHER[p.name].find(([n,req])=>req>p.skill);
      body=`<p class="small" style="margin:0">${ups.length?`Skill-ups now from ${ups.map(u=>u[0]).join(", ")}.`:"Nothing in your zones still gives skill-ups. Raise your zone reach or level up."}${next?` ${next[0]} unlocks at ${next[1]}.`:""}</p>`;
    } else if(path){
      const b=path.find(x=>p.skill>=x[0]&&p.skill<x[1])||path[path.length-1];const nb=path[path.indexOf(b)+1];
      body=`<div class="list">${b[2].map(n=>{const g=canGather(c,n);const m=MAT[n]||{name:n,cat:"Other",tier:3};const w=windows(m,tg,"buy",168);const e=estimate(n);
        return `<button class="item" type="button" data-mat="${esc(n)}"><span class="nm">${esc(n)}</span><span class="right">${e?money(e.now):'<span class="small muted">add price</span>'}</span>
        <span class="meta small">${g?`<span class="pill good">Farm it</span> ${esc(g.zones.slice(0,2).map(zl).join(", "))}${g.smelt?` (smelt ${esc(g.smelt.join(" + "))})`:""}`:`<span class="pill acc">Buy</span> ${w.best.s<w.now-0.02?`cheapest ${esc(whenTxt(w.best.t))} (${pct(w.best.s/w.now-1)})`:"any time this week"}`}</span></button>`}).join("")}</div>
      ${nb?`<p class="small muted" style="margin:0">From ${nb[0]}: ${esc(nb[2].join(", "))}.</p>`:""}`;
    } else body=`<p class="small muted" style="margin:0">No material path for ${esc(p.name)} yet.</p>`;
    return `<section class="card">
      <div class="row between"><h2>${esc(p.name)}</h2><span class="money">${p.skill}/300</span></div>
      <div class="skillbar"><i style="width:${Math.min(100,p.skill/3)}%"></i></div>
      ${rb?`<div class="banner">${esc(rb.msg)}</div>`:""}
      ${path?`<h3>Skill ${(path.find(x=>p.skill>=x[0]&&p.skill<x[1])||path[path.length-1]).slice(0,2).join("–")}</h3>`:""}
      ${body}
    </section>`}).join("")+`<p class="small muted">Material paths follow Classic leveling routes. Forever may differ, for example First Aid now also makes healing potions.</p>`;
}

export function vPlan(c){
  const steps=sessionPlan(c,S.mins);
  return `
  <section class="card">
    <h2>How long can you play?</h2>
    <div class="tabs" role="group" aria-label="Session length">${[30,60,120].map(m=>`<button type="button" data-act="mins" data-m="${m}" aria-pressed="${S.mins===m}">${m<60?m+" min":m/60+" hr"+(m>60?"s":"")}</button>`).join("")}</div>
  </section>
  <section class="card">
    <h2>Your ${S.mins<60?S.mins+"-minute":S.mins/60+"-hour"} session</h2>
    <ol class="steps">${steps.map(s=>`<li><div><b>${esc(s.t)}</b> <span class="small muted">${s.m} min</span><p class="small" style="margin:4px 0 0">${esc(s.b)}</p></div></li>`).join("")}</ol>
  </section>`;
}
