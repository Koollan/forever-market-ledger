// @ts-nocheck
// The single-file app's script, moved unchanged (T2 step 6). Later steps move pieces out into typed modules.
import { CLASSES, PROFS, CONS_TAGS } from "./data/classes";
import { GATHER, SMELT, GATHER_RATE } from "./data/gathering";
import { ZONES, ZONE, STONE_OF, LEATHER_TIERS, SKIN_SPECIAL, KALIMDOR, DENSITY } from "./data/zones";
import { CONSUMABLES, HOUSES } from "./data/consumables";
import { RANKS, PATHS } from "./data/professions";
import { SKIN_SPOTS } from "./data/skinSpots";
import { LAUNCH, MATS, MAT, RAW, CONSUME, FA_HERBS, tierOfLevel, zoneTier } from "./data/materials";
import { keyOf, plainMoney, median, andList, pct, whenTxt as whenTxtAt } from "./engine/util";
import { esc, money } from "./ui/format";
import { frontLevel, ctxAt, RULES, shiftAt, windows as windowsAt } from "./engine/conditions";
import { estimate as estimateAt } from "./engine/estimate";
import { zl, estBudget, budgetOf, reachZones, whereGather } from "./engine/farm";
import { profOf, canGather, needsFor, rankBlock, houseOf, cutFor, skillColor, perHour as perHourOf } from "./engine/character";
import { skinReq, skinPlan, skinSpots, skinLine } from "./engine/skinning";
import { continentOf, zoneDossier as zoneDossierAt } from "./engine/dossier";
import { gatherOptions as gatherOptionsAt, bestFarm as bestFarmAt, sellAdvice as sellAdviceAt, todaySuggestions as todaySuggestionsAt, sessionPlan as sessionPlanAt } from "./engine/suggestions";
import { validateBackup, buildBackup, backupData } from "./engine/backup";
"use strict";
/* ============ Reference data (Classic-era rules used by WoW Forever) ============ */
/* A flip only counts if it fits the budget, has real margin and won't need to corner the market */
/* ============ Helpers ============ */
const $=s=>document.querySelector(s);
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<60)return m+"m ago";const h=Math.round(m/60);if(h<48)return h+"h ago";return Math.round(h/24)+"d ago"}
function toast(msg){const t=$("#toast");t.textContent=msg;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",3200)}
const uid8=()=>Math.random().toString(36).slice(2,10);

/* ============ Storage: this device only (localStorage) ============ */
function cacheLocal(){try{localStorage.setItem("fml-cache",JSON.stringify({state:S.state,items:S.items}))}catch(e){}}
function readLocal(){try{return JSON.parse(localStorage.getItem("fml-cache")||"null")}catch(e){return null}}


/* ============ Materials catalog ============ */

/* ============ Conditions engine and estimates (src/engine) ============ */
// Old signatures read the clock and app state here, so behavior is unchanged while call sites move
const windows=(m,toggles,mode,hours)=>windowsAt(m,toggles,mode,hours,Date.now());
const whenTxt=t=>whenTxtAt(t,Date.now());
const perHour=o=>perHourOf(o,char());
const zoneDossier=(c,Zr)=>zoneDossierAt(c,Zr,Date.now(),S.state.toggles);
// Suggestions read the clock and app state here; the engine takes them as a context
const cx=()=>({now:Date.now(),items:S.items,toggles:S.state.toggles});
const gatherOptions=c=>gatherOptionsAt(c,cx());
const bestFarm=c=>bestFarmAt(c,cx());
const sellAdvice=c=>sellAdviceAt(c,cx());
const todaySuggestions=c=>todaySuggestionsAt(c,cx());
const sessionPlan=(c,mins)=>sessionPlanAt(c,mins,cx());
const estimate=(name,when)=>estimateAt(name,S.items,S.state.toggles,when||Date.now());

/* ============ Prices you enter ============ */
function itemFor(name){return S.items[keyOf(name)]||null}
function lastPrice(name){const it=itemFor(name);const h=it?.hist||[];return h.length?h[h.length-1]:null}
async function recordPrice(name,copper){
  const key=keyOf(name);const it=S.items[key]||{key,name,hist:[]};
  it.hist=(it.hist||[]).filter(p=>Date.now()-p.t>10*6e4).concat([{t:Date.now(),price:copper}]).slice(-60);
  S.items[key]=it;cacheLocal();
}
async function deletePrices(name){const key=keyOf(name);delete S.items[key];cacheLocal()}

/* ============ Character helpers ============ */

/* ============ Suggestions (pre-written, filled from rules) ============ */
/* ============ Skinning spots: beasts, levels and subzones (Classic spawns via RankedBoost; Forever may differ) ============ */
/* ============ Zone dossiers: when, where and why, per character ============ */
/* ============ Backup: export and import (src/engine/backup.ts) ============ */

/* ============ App state ============ */
const S={
  state:{characters:[{id:"ex",name:"Example rogue",cls:"Rogue",level:15,faction:"Alliance",region:"us",gold:null,stretch:2,profs:[{name:"Herbalism",skill:90},{name:"Skinning",skill:80}],example:true}],activeId:"ex",toggles:{}},
  items:{},tab:"today",mins:60,q:""
};
const char=()=>S.state.characters.find(c=>c.id===S.state.activeId)||S.state.characters[0];
function saveState(){cacheLocal();return Promise.resolve()}

/* ============ Rendering ============ */
const ICONS={
 today:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
 farm:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c4-3 7-7 7-12a7 7 0 0 0-14 0c0 5 3 9 7 12z"/><path d="M12 22V10"/><path d="M12 14l-3-3M12 12l3-3"/></svg>',
 prices:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
 skills:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/></svg>',
 plan:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/></svg>'
};
const TABS=[["today","Today"],["farm","Farm"],["prices","Prices"],["skills","Professions"],["plan","Session"]];
function renderNav(){$("#nav").innerHTML=TABS.map(([k,l])=>`<button type="button" data-tab="${k}" ${S.tab===k?'aria-current="page"':""}>${ICONS[k]}<span>${l}</span></button>`).join("")}
function renderHeader(){
  const c=char();$("#charName").textContent=`${c.name} · ${c.level} ${c.cls}`;$("#charDot").style.background=CLASSES[c.cls]?.c||"#888";
  $("#sub").textContent=`${HOUSES[houseOf(c)].label} · budget ${plainMoney(budgetOf(c))}${c.gold==null?" (est.)":""}`;
}
function banners(c){
  let b="";
  if(c.example)b+=`<div class="banner">This is an example character. Set up yours so every suggestion fits your class, level, zones and professions. <button class="btn small" type="button" data-act="editChar" data-id="${c.id}">Set up character</button></div>`;
  else if(c.gold==null)b+=`<div class="banner">Using a typical budget for level ${c.level}. <button class="btn small" type="button" data-act="editChar" data-id="${c.id}">Set your gold</button></div>`;
  return b;
}
function render(){
  renderHeader();renderNav();const c=char();
  $("#view").innerHTML=banners(c)+({today:vToday,farm:vFarm,prices:vPrices,skills:vSkills,plan:vPlan}[S.tab])(c);
  $("#view").scrollTop=0;
}
const KIND_PILL={Farm:"acc",Sell:"good",Hold:"warn",Buy:"acc",Level:"bad",Train:"warn",Tip:""};

function vToday(c){
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

function vFarm(c){
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

function vPrices(c){
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

function vSkills(c){
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

function vPlan(c){
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

/* ============ Sheets ============ */
function openSheet(html){$("#sheetPanel").innerHTML=html;$("#sheet").classList.add("open");$("#sheetPanel").scrollTop=0}
function closeSheet(){$("#sheet").classList.remove("open")}
function sheetMat(name){
  const c=char();const m=MAT[name]||{name,cat:"Other",tier:3};const tg=S.state.toggles;const e=estimate(name);
  const s=shiftAt(m,Date.now(),tg);const ws=windows(m,tg,"sell",168),wb=windows(m,tg,"buy",168);
  const g=canGather(c,name);const it=itemFor(name);
  const hist=(it?.hist||[]).slice().reverse();
  openSheet(`
    <div class="row between"><h2>${esc(name)}</h2><button class="btn small" type="button" data-act="close">Close</button></div>
    <div class="btns"><span class="pill">${esc(m.cat)} · tier ${m.tier}</span>${g?`<span class="pill good">You can ${g.smelt?"mine and smelt":"gather"} it</span>`:""}</div>
    <div class="stat">
      <div><b>${e?plainMoney(e.now):"—"}</b><span>estimate now</span></div>
      <div><b>${pct(s.mult-1)}</b><span>today vs normal</span></div>
      <div><b>${e?e.n:0}</b><span>prices entered</span></div>
    </div>
    <div class="banner">${ws.best.s>ws.now*1.03?`Sell: wait for ${esc(whenTxt(ws.best.t))} (${pct(ws.best.s/ws.now-1)} vs now).`:"Sell: now is about as good as this week gets."} ${wb.best.s<wb.now*0.97?`Buy: ${esc(whenTxt(wb.best.t))} is cheapest (${pct(wb.best.s/wb.now-1)}).`:"Buy: no better window this week."}</div>
    ${s.why.length?`<p class="small muted" style="margin:0">${esc(s.why.map(w=>`${pct(w.p/100)} ${w.why}`).join(" · "))}</p>`:""}
    ${g?`<p class="small" style="margin:0"><b>Where:</b> ${esc(g.zones.map(zl).join(", "))}</p>`:""}
    <form id="priceForm" class="card" style="padding:12px">
      <h3>Add a price you saw</h3>
      <div class="grid2" style="grid-template-columns:1fr 1fr 1fr">
        <label for="pg">Gold<input id="pg" type="number" min="0" inputmode="numeric" placeholder="0"></label>
        <label for="ps">Silver<input id="ps" type="number" min="0" max="99" inputmode="numeric" placeholder="0"></label>
        <label for="pc">Copper<input id="pc" type="number" min="0" max="99" inputmode="numeric" placeholder="0"></label>
      </div>
      <button class="btn primary" type="submit">Save price</button>
    </form>
    ${hist.length?`<h3>Prices you entered</h3><div class="list">${hist.slice(0,8).map(p=>`<div class="item"><span class="nm">${money(p.price)}</span><span class="right small muted">${new Date(p.t).toLocaleString(undefined,{weekday:"short",month:"short",day:"numeric",hour:"numeric"})}</span></div>`).join("")}</div><button class="btn small" type="button" data-act="clearPrices" data-name="${esc(name)}">Delete these prices</button>`:""}`);
  $("#priceForm").addEventListener("submit",async ev=>{ev.preventDefault();
    const cp=(+$("#pg").value||0)*10000+(+$("#ps").value||0)*100+(+$("#pc").value||0);
    if(cp<=0){toast("Enter a price first");return}
    await recordPrice(name,cp);toast(`Saved ${plainMoney(cp)} for ${name}`);render();sheetMat(name)});
}
function sheetChar(id){
  const c=S.state.characters.find(x=>x.id===id)||{id:"new",name:"",cls:"Warrior",level:20,faction:"Horde",profs:[]};
  const p=n=>c.profs.find(x=>x.name===n);
  openSheet(`
    <div class="row between"><h2>${id==="new"?"New character":"Edit character"}</h2><button class="btn small" type="button" data-act="close">Close</button></div>
    <form id="charForm" class="card" style="padding:0;border:0">
      <label for="cName">Name<input id="cName" required value="${esc(c.example?"":c.name)}" placeholder="Character name"></label>
      <div class="grid2">
        <label for="cCls">Class<select id="cCls">${Object.keys(CLASSES).map(k=>`<option ${k===c.cls?"selected":""}>${k}</option>`).join("")}</select></label>
        <label for="cLvl">Level<input id="cLvl" type="number" min="1" max="60" value="${c.level}"></label>
      </div>
      <label for="cReg">Region<select id="cReg"><option value="us" ${(c.region||"us")==="us"?"selected":""}>US</option><option value="eu" ${c.region==="eu"?"selected":""}>EU</option></select></label>
      <label for="cFac">Faction<select id="cFac"><option ${c.faction==="Horde"?"selected":""}>Horde</option><option ${c.faction==="Alliance"?"selected":""}>Alliance</option></select></label>
      <div class="grid2">
        <label for="cGold">Gold you can spend on the AH<input id="cGold" type="number" min="0" step="0.01" inputmode="decimal" placeholder="e.g. ${(estBudget(c.level)/10000).toFixed(0)} (typical)" value="${c.gold!=null?+(c.gold/10000).toFixed(2):""}"></label>
        <label for="cStretch">Zone reach<select id="cStretch">${[0,1,2,3,4,5].map(n=>`<option value="${n}" ${(c.stretch??2)===n?"selected":""}>${n?`up to +${n} levels`:"at my level only"}</option>`).join("")}</select></label>
      </div>
      <label style="flex-direction:row;align-items:center;gap:8px;color:var(--ink)"><input id="cSky" type="checkbox" style="width:auto" ${c.skyborne?"checked":""}> Skyborne (can farm Zephras Isle)</label>
      <p class="small muted" style="margin:0">Gold is in g (2.5 = 2g 50s). Leave it blank to use a typical amount for your level. Zone reach sets how far above your level a zone can start and still count for farming.</p>
      <h3>Professions and skill</h3>
      <div class="grid2">${PROFS.map((n,i)=>`<label for="pf${i}">${n}<input id="pf${i}" data-prof="${n}" type="number" min="0" max="300" placeholder="—" value="${p(n)?p(n).skill:""}"></label>`).join("")}</div>
      <p class="small muted" style="margin:0">Leave a profession blank if you don't have it. Enter 1 for a profession you just learned.</p>
      <div class="btns"><button class="btn primary" type="submit">Save character</button>${id!=="new"&&S.state.characters.length>1?`<button class="btn" type="button" data-act="delChar" data-id="${esc(c.id)}">Delete</button>`:""}</div>
    </form>`);
  $("#charForm").addEventListener("submit",e=>{
    e.preventDefault();
    const nc={id:id==="new"||c.example?uid8():c.id,name:$("#cName").value.trim()||"Unnamed",cls:$("#cCls").value,level:Math.max(1,Math.min(60,+$("#cLvl").value||1)),faction:$("#cFac").value,region:$("#cReg").value,skyborne:$("#cSky").checked,
      gold:$("#cGold").value===""?null:Math.round(Math.max(0,+$("#cGold").value)*10000),stretch:+$("#cStretch").value,
      profs:[...document.querySelectorAll("[data-prof]")].filter(i=>i.value!=="").map(i=>({name:i.dataset.prof,skill:Math.max(0,Math.min(300,+i.value))}))};
    const list=S.state.characters.filter(x=>!x.example&&x.id!==c.id);
    list.push(nc);S.state.characters=list;S.state.activeId=nc.id;
    saveState();closeSheet();render();toast("Character saved");
  });
}
function sheetChars(){
  openSheet(`
    <div class="row between"><h2>Characters</h2><button class="btn small" type="button" data-act="close">Close</button></div>
    <div class="list">${S.state.characters.map(c=>`<div class="item"><span class="nm"><i class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${CLASSES[c.cls]?.c}"></i> ${esc(c.name)}</span>
      <span class="right"><span class="btns"><button class="btn small ${c.id===S.state.activeId?"primary":""}" type="button" data-act="useChar" data-id="${esc(c.id)}">${c.id===S.state.activeId?"Active":"Use"}</button><button class="btn small" type="button" data-act="editChar" data-id="${esc(c.id)}">Edit</button></span></span>
      <span class="meta small muted">Level ${c.level} ${esc(c.cls)} · ${esc(c.faction)} · ${c.profs.map(p=>esc(p.name)+" "+p.skill).join(", ")||"no professions"}</span></div>`).join("")}</div>
    <button class="btn primary" type="button" data-act="editChar" data-id="new">Add character</button>
    <p class="small muted" style="margin:0">Saved on this device only. Use Backup below to move it to another device.</p>
    <h3>Backup</h3>
    <p class="small muted" style="margin:0">Export copies your characters and prices as text you can keep or paste into the app on another device.</p>
    <div class="btns"><button class="btn" type="button" data-act="exportData">Export</button></div>
    <div id="bkExport" hidden>
      <textarea id="bkOut" readonly aria-label="Backup text"></textarea>
      <div class="btns" style="margin-top:8px"><button class="btn primary" type="button" data-act="copyBackup">Copy</button></div>
      <p id="bkMsg" class="small muted" style="margin:6px 0 0"></p>
    </div>
    <p class="small muted" style="margin:0">Import replaces everything on this device with a backup you paste here.</p>
    <textarea id="bkIn" aria-label="Paste a backup" placeholder="Paste a backup here"></textarea>
    <div class="btns"><button class="btn" type="button" data-act="checkImport">Import</button></div>
    <div id="bkConfirm" class="card" role="alert" hidden></div>`);
}
const plural=(n,w)=>n+" "+w+(n===1?"":"s");
function checkImport(){
  const box=$("#bkConfirm");if(!box)return;
  const r=validateBackup($("#bkIn").value);
  box.hidden=false;
  if(!r.ok){S.pendingImport=null;box.innerHTML=`<p class="small" style="margin:0">${esc(r.error)}</p>`;return}
  S.pendingImport=r.backup;
  box.innerHTML=`<p style="margin:0"><b>Replace with ${plural(r.counts.characters,"character")} and ${plural(r.counts.prices,"price")}?</b></p>
    <p class="small muted" style="margin:0">The characters and prices on this device are removed.</p>
    <div class="btns"><button class="btn primary" type="button" data-act="applyImport">Replace</button><button class="btn" type="button" data-act="cancelImport">Cancel</button></div>`;
}
function cancelImport(){S.pendingImport=null;const box=$("#bkConfirm");if(box){box.hidden=true;box.innerHTML=""}}
async function applyBackup(b){
  const d=backupData(b);
  S.state=d.state;S.items=d.items;S.pendingImport=null;
  cacheLocal();
}
function showExport(){
  const box=$("#bkExport"),out=$("#bkOut");if(!box||!out)return;
  out.value=JSON.stringify(buildBackup(S.state,S.items,Date.now()),null,1);
  box.hidden=false;$("#bkMsg").textContent="";
}
async function copyBackup(){
  const out=$("#bkOut"),msg=$("#bkMsg");if(!out)return;
  try{await navigator.clipboard.writeText(out.value);msg.textContent="Copied. Paste it somewhere safe, or into Import on your other device."}
  catch(e){out.focus();out.select();msg.textContent="Copy is blocked here. The text is selected: copy it by hand (Ctrl+C, or long-press on a phone)."}
}


/* ============ Actions ============ */
document.addEventListener("click",e=>{
  if(e.target.id==="sheet"){closeSheet();return}
  const el=e.target.closest("[data-tab],[data-act],[data-mat]");if(!el)return;
  if(el.dataset.tab){S.tab=el.dataset.tab;render();return}
  if(el.dataset.mat&&!el.dataset.act){sheetMat(el.dataset.mat);return}
  const a=el.dataset.act;
  if(a==="close")closeSheet();
  else if(a==="mins"){S.mins=+el.dataset.m;render()}
  else if(a==="clearPrices"){deletePrices(el.dataset.name).then(()=>{closeSheet();render();toast("Prices deleted")})}
  else if(a==="editChar")sheetChar(el.dataset.id);
  else if(a==="exportData")showExport();
  else if(a==="copyBackup")copyBackup();
  else if(a==="checkImport")checkImport();
  else if(a==="cancelImport")cancelImport();
  else if(a==="applyImport"&&S.pendingImport){applyBackup(S.pendingImport).then(()=>{closeSheet();render();toast("Backup imported")})}
  else if(a==="useChar"){S.state.activeId=el.dataset.id;saveState();closeSheet();render()}
  else if(a==="delChar"){S.state.characters=S.state.characters.filter(c=>c.id!==el.dataset.id);S.state.activeId=S.state.characters[0].id;saveState();closeSheet();render()}
});
document.addEventListener("input",e=>{if(e.target.id==="matQ"){S.q=e.target.value;const pos=e.target.selectionStart;render();const i=$("#matQ");if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(_){}}}});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
$("#charBtn").addEventListener("click",sheetChars);
window.addEventListener("error",e=>toast("Something broke: "+(e.message||"unknown error")));
window.addEventListener("unhandledrejection",e=>toast("Something broke: "+((e.reason&&e.reason.message)||e.reason||"unknown error")));

/* ============ Boot ============ */
(function boot(){
  const loc=readLocal();
  const clean=items=>Object.fromEntries(Object.entries(items||{}).filter(([k,v])=>v&&Array.isArray(v.hist)&&v.hist.every(p=>p.price!=null)));
  if(loc&&loc.state){S.state=Object.assign(S.state,loc.state,{toggles:loc.state.toggles||{}});S.items=clean(loc.items)}
  render();
})();

// Test hook: as a module, the script's functions are no longer globals, so the behavior lock
// (tests/e2e/capture.ts) reads them from here. Same names and signatures as the single file.
window.__fml = {char, reachZones, budgetOf, gatherOptions, bestFarm, skinSpots, zoneDossier,
  sellAdvice, needsFor, todaySuggestions, sessionPlan, shiftAt, windows, estimate, MATS, S};
