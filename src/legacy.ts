// @ts-nocheck
// The single-file app's script, moved unchanged (T2 step 6). Later steps move pieces out into typed modules.
import { CLASSES, PROFS, CONS_TAGS } from "./data/classes";
import { GATHER, SMELT, GATHER_RATE } from "./data/gathering";
import { ZONES, ZONE, STONE_OF, LEATHER_TIERS, SKIN_SPECIAL, KALIMDOR, DENSITY } from "./data/zones";
import { CONSUMABLES, HOUSES } from "./data/consumables";
import { RANKS, PATHS } from "./data/professions";
import { SKIN_SPOTS } from "./data/skinSpots";
import { LAUNCH, MATS, MAT, RAW, CONSUME, FA_HERBS, tierOfLevel, zoneTier } from "./data/materials";
import { validateBackup, buildBackup, backupData, staleKeys } from "./engine/backup";
"use strict";
/* ============ Reference data (Classic-era rules used by WoW Forever) ============ */
const zl=n=>ZONE[n]?.est?n+" (est.)":n; // new Forever zones whose nodes aren't charted yet
/* Typical spendable gold by level when the player hasn't entered their own (copper) */
function estBudget(l){return l<10?5000:l<20?40000:l<30?200000:l<40?600000:l<50?1500000:l<60?3000000:6000000}
function budgetOf(c){return c.gold!=null&&c.gold>=0?c.gold:estBudget(c.level)}
function reachZones(c){const f=c.faction==="Alliance"?"A":"H";const s=c.stretch??2;return ZONES.filter(z=>(z.f==="C"||z.f===f)&&z.min<=c.level+s&&(!z.skyborne||c.skyborne))}
/* Where can this character gather an item? -> {zones:[names], unlock:level|null} */
function whereGather(name,prof,c){
  const zs=reachZones(c),f=c.faction==="Alliance"?"A":"H",s=c.stretch??2;
  const all=ZONES.filter(z=>(z.f==="C"||z.f===f)&&(!z.skyborne||c.skyborne));
  let has;
  if(prof==="Herbalism")has=z=>z.herbs.includes(name);
  else if(prof==="Mining"){const ore=STONE_OF[name]||name;has=z=>z.ores.includes(ore)}
  else if(prof==="Skinning"){
    if(SKIN_SPECIAL[name])has=z=>SKIN_SPECIAL[name].includes(z.name);
    else{const tier=name==="Ruined Leather Scraps"?LEATHER_TIERS[0]:LEATHER_TIERS.find(t=>name.startsWith(t[0]+" "));
      if(!tier)return{zones:[],unlock:null};
      // a mob tier is reachable if the zone overlaps it and those mobs are within the character's kill range
      has=z=>z.min<=tier[2]&&z.max>=tier[1]&&tier[1]<=c.level+s;
      const inZone=z=>z.min<=tier[2]&&z.max>=tier[1];
      const ok=zs.filter(has).map(z=>z.name);
      const lv=all.filter(inZone).map(z=>Math.max(z.min,tier[1]));
      return{zones:ok,unlock:ok.length?null:(lv.length?Math.max(1,Math.min(...lv)-s):null)};}
  } else return{zones:[],unlock:null};
  const ok=zs.filter(has).map(z=>z.name);
  const lock=all.filter(has).map(z=>prof==="Skinning"&&!SKIN_SPECIAL[name]?Math.max(z.min,(LEATHER_TIERS.find(t=>name.startsWith(t[0]+" "))||[0,1])[1]):z.min);
  return{zones:ok,unlock:ok.length?null:(lock.length?Math.max(1,Math.min(...lock)-s):null)};
}
/* A flip only counts if it fits the budget, has real margin and won't need to corner the market */
/* ============ Helpers ============ */
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const keyOf=n=>"item~"+String(n).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,120);
function money(c){
  if(c==null||!isFinite(c))return '<span class="money muted">—</span>';
  c=Math.round(c);const neg=c<0;c=Math.abs(c);
  const g=Math.floor(c/10000),s=Math.floor(c%10000/100),cc=c%100;
  let o="";if(g)o+=`${g.toLocaleString()}<span class="g">g</span> `;if(s||g)o+=`${s}<span class="s">s</span>`;if(!g)o+=` ${cc}<span class="c">c</span>`;
  return `<span class="money">${neg?"−":""}${o.trim()}</span>`;
}
function plainMoney(c){if(c==null)return"?";c=Math.round(c);const g=Math.floor(c/10000),s=Math.floor(c%10000/100),cc=c%100;return g?`${g}g ${s}s`:s?`${s}s ${cc}c`:`${cc}c`}
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<60)return m+"m ago";const h=Math.round(m/60);if(h<48)return h+"h ago";return Math.round(h/24)+"d ago"}
function toast(msg){const t=$("#toast");t.textContent=msg;t.style.display="block";clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display="none",3200)}
const median=a=>{const b=a.filter(x=>x!=null&&isFinite(x)).sort((x,y)=>x-y);if(!b.length)return null;const m=b.length>>1;return b.length%2?b[m]:(b[m-1]+b[m])/2};
const uid8=()=>Math.random().toString(36).slice(2,10);
// True only inside claude.ai, where the optional Ask Claude call and private sync exist
const inClaude=()=>!!(window.claude&&typeof window.claude.use==="function");

/* ============ Storage: private per-viewer db, local cache as fallback ============ */
const Store={db:null,uid:null,mode:"local",q:{},
  async init(){
    if(!(window.claude&&typeof window.claude.use==="function"))return;
    try{
      const [db,user]=await Promise.all([claude.use("db"),claude.use("user")]);
      const id=user?await user.id():null;
      if(db&&id){this.db=db;this.uid=id;this.mode="db"}
    }catch(e){}
  },
  col(){return this.db.collection("data/users/"+this.uid)},
  async load(){
    if(this.mode!=="db")return null;
    const timer=new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")),10000));
    const snap=await Promise.race([this.col().get(),timer]);
    const out={state:null,items:{}};
    snap.docs.forEach(d=>{if(!d.exists)return;const v=d.data();if(d.id==="state")out.state=JSON.parse(JSON.stringify(v));else if(d.id.startsWith("item~"))out.items[d.id]=JSON.parse(JSON.stringify(v))});
    return out;
  },
  save(id,body){ // one write at a time per doc
    cacheLocal();
    if(this.mode!=="db")return Promise.resolve();
    const prev=this.q[id]||Promise.resolve();
    const next=prev.then(()=>this.col().doc(id).set(body)).catch(e=>{if(e&&e.code==="quota_exceeded")toast("Storage is full. Remove old items in Settings.");});
    this.q[id]=next;return next;
  },
  remove(id){if(this.mode!=="db")return Promise.resolve();return this.col().doc(id).delete().catch(()=>{})}
};
function cacheLocal(){try{localStorage.setItem("fml-cache",JSON.stringify({state:S.state,items:S.items}))}catch(e){}}
function readLocal(){try{return JSON.parse(localStorage.getItem("fml-cache")||"null")}catch(e){return null}}


/* ============ Materials catalog ============ */

/* ============ Conditions engine: rule-based price shifts ============ */
function frontLevel(t){const d=Math.max(0,(t-LAUNCH)/864e5);return Math.min(60,8+52*(1-Math.exp(-d/25)))}
function ctxAt(t,toggles){
  const d=new Date(t);const day=d.getDay(),h=d.getHours();
  const days=Math.max(0,Math.floor((t-LAUNCH)/864e5));
  return{t,day,h,days,front:frontLevel(t),frontTier:tierOfLevel(frontLevel(t)),
    weekend:day===6||day===0||(day===5&&h>=17),midweek:day>=2&&day<=4,
    raidPrep:(day===1&&h>=17)||day===2,prime:h>=18&&h<23,offpeak:h>=3&&h<10,
    endgame:days>=21,toggles:toggles||{}};
}
/* Each rule: when it applies, which materials it moves, by how much, and what to do about it. */
const RULES=[
 {id:"front",label:c=>`Most players are around level ${Math.round(c.front)}`,
  act:"Sell what the crowd is leveling into; buy what they've moved past.",
  hit:(m,c)=>{const g=m.tier-c.frontTier;
    if(g===0)return{p:12,why:"most players are leveling through this bracket now"};
    if(g===1)return{p:6,why:"the leveling crowd reaches this bracket soon"};
    if(g===-1)return{p:-4,why:"the crowd is moving past this bracket"};
    if(g<=-2)return{p:-12,why:"most players have outleveled this bracket"};
    return null}},
 {id:"endgame",when:c=>c.endgame,label:()=>"Endgame demand",act:"Level-60 materials sell well; hold them for raid nights.",
  hit:m=>m.tier===6?{p:10,why:"level-60 players buy raid and crafting materials"}:null},
 {id:"weekend",when:c=>c.weekend,label:()=>"Weekend",act:"Buy raw materials now; sell what you gather Tuesday to Thursday.",
  hit:m=>RAW.has(m.cat)?{p:-7,why:"weekend farmers flood raw materials"}:null},
 {id:"midweek",when:c=>c.midweek,label:()=>"Midweek",act:"Good days to list raw materials.",
  hit:m=>RAW.has(m.cat)?{p:4,why:"weekday supply is thinner"}:null},
 {id:"raid",when:c=>c.raidPrep&&c.days>=14,label:()=>"Raid reset prep",act:"List potions, elixirs and endgame materials before Tuesday's reset.",
  hit:m=>CONSUME.has(m.cat)||m.tier===6?{p:10,why:"raiders restock before the reset"}:null},
 {id:"greenhouse",when:c=>c.days>=30,label:()=>"Greenhouse herbs reaching the market",act:"Sell herbs promptly rather than stockpiling.",
  hit:m=>m.cat==="Herb"?{p:-3,why:"herbalists' greenhouses add steady supply"}:null}
];
function shiftAt(m,t,toggles,mode){ // mode: "sell" adds listing-exposure effects, "buy" adds quiet-hour discounts
  const c=ctxAt(t,toggles);let mult=1;const why=[];
  for(const r of RULES){if(r.when&&!r.when(c))continue;const x=r.hit(m,c);if(x){mult*=1+x.p/100;why.push({p:x.p,why:x.why,id:r.id})}}
  if(mode==="sell"&&c.prime){mult*=1.03;why.push({p:3,why:"prime time: more buyers browsing",id:"prime"})}
  if(mode==="buy"&&c.offpeak){mult*=0.97;why.push({p:-3,why:"quiet hours: overnight undercuts are still up",id:"quiet"})}
  return{mult:Math.max(.6,Math.min(1.6,mult)),why,ctx:c};
}
function windows(m,toggles,mode,hours){ // best and worst 3-hour slots over the next N hours
  const now=Date.now();const slots=[];
  for(let k=0;k<=hours;k+=3){const t=now+k*36e5;slots.push({t,s:shiftAt(m,t,toggles,mode).mult})}
  const best=slots.reduce((a,b)=>mode==="sell"?(b.s>a.s?b:a):(b.s<a.s?b:a));
  return{now:slots[0].s,best};
}
const whenTxt=t=>{const d=new Date(t);const diff=(t-Date.now())/36e5;if(diff<1.5)return"now";
  return d.toLocaleString(undefined,{weekday:"short",hour:"numeric"})};
const andList=a=>a.length<2?a.join(""):a.slice(0,-1).join(", ")+" and "+a[a.length-1];
const pct=x=>(x>=0?"+":"−")+Math.abs(Math.round(x*100))+"%";

/* ============ Prices you enter ============ */
function itemFor(name){return S.items[keyOf(name)]||null}
function lastPrice(name){const it=itemFor(name);const h=it?.hist||[];return h.length?h[h.length-1]:null}
// Base value = your observations with each one's conditions removed; estimate = base x conditions now
function estimate(name,when){
  const m=MAT[name]||{name,cat:"Other",tier:3};const it=itemFor(name);if(!it||!it.hist?.length)return null;
  const tg=S.state.toggles;
  const bases=it.hist.map(p=>p.price/shiftAt(m,p.t,tg).mult);
  const base=median(bases);const s=shiftAt(m,when||Date.now(),tg);
  return{base,now:Math.round(base*s.mult),mult:s.mult,why:s.why,n:it.hist.length,last:it.hist[it.hist.length-1]};
}
async function recordPrice(name,copper){
  const key=keyOf(name);const it=S.items[key]||{key,name,hist:[]};
  it.hist=(it.hist||[]).filter(p=>Date.now()-p.t>10*6e4).concat([{t:Date.now(),price:copper}]).slice(-60);
  S.items[key]=it;cacheLocal();await Store.save(key,it);
}
async function deletePrices(name){const key=keyOf(name);delete S.items[key];cacheLocal();await Store.remove(key)}

/* ============ Character helpers ============ */
function profOf(c,n){return c.profs.find(p=>p.name===n)}
function canGather(c,name){ // can this character gather it in their zones at their skill?
  const m=MAT[name];if(m&&m.gather){const p=profOf(c,m.gather);if(!p||p.skill<m.req)return null;const w=whereGather(name,m.gather,c);return w.zones.length?{prof:m.gather,zones:w.zones}:null}
  const ores=SMELT[name];if(ores){const p=profOf(c,"Mining");if(!p)return null;
    const ok=ores.every(o=>MAT[o]&&p.skill>=MAT[o].req&&whereGather(o,"Mining",c).zones.length);return ok?{prof:"Mining",zones:whereGather(ores[0],"Mining",c).zones,smelt:ores}:null}
  return null;
}
function rankBlock(c,p){
  const r=RANKS.find(x=>p.skill<x.cap)||RANKS[3];
  const next=RANKS[RANKS.indexOf(r)+1];
  if(p.skill>=r.cap-5&&next){
    if(c.level<next.lvl)return{msg:`You'll hit the ${r.cap} cap soon. ${next.name} training needs level ${next.lvl} (you're ${c.level}).`,blocked:true};
    return{msg:`Train ${next.name} soon: you're near the ${r.cap} cap.`};
  }
  return null;
}

/* ============ Suggestions (pre-written, filled from rules) ============ */
function gatherOptions(c){
  const out=[];const tg=S.state.toggles;
  for(const p of c.profs){
    if(!GATHER[p.name])continue;
    for(const [n,req] of GATHER[p.name]){
      if(p.skill<req)continue;const w=whereGather(n,p.name,c);if(!w.zones.length)continue;
      const col=skillColor(p.skill,req);const e=estimate(n);const m=MAT[n];
      const s=shiftAt(m,Date.now(),tg);
      out.push({prof:p.name,name:n,req,zones:w.zones,col:col[0],colCls:col[1],est:e,shift:s.mult,why:s.why,
        skillUp:col[0]==="orange"?2:col[0]==="yellow"?1:0});
    }
  }
  return out;
}
function bestFarm(c){
  const opts=gatherOptions(c);if(!opts.length)return null;
  // score zones by skill-ups and known value of what grows there
  const zones={};
  for(const o of opts)for(const z of o.zones){
    const Z=zones[z]||(zones[z]={zone:z,items:[],score:0});
    Z.items.push(o);Z.score+=o.skillUp*3+(o.est?Math.log10(1+o.est.now)*1.5:0)+(o.shift-1)*10;
  }
  // skinners: weight zones by their mapped beast spots
  if(profOf(c,"Skinning"))for(const Z of Object.values(zones)){
    const sp=SKIN_SPOTS.filter(x=>x.zone===Z.zone).map(x=>skinPlan(c,x)).filter(Boolean);if(!sp.length)continue;
    const ok=sp.filter(x=>!x.lockedAt).sort((a,b)=>b.score-a.score)[0];
    if(ok)Z.score+={orange:6,yellow:3,green:1}[ok.col[0]]||0;else Z.score-=4;
  }
  const list=Object.values(zones).sort((a,b)=>b.score-a.score);
  return{top:list[0],list,opts};
}


/* ============ Skinning spots: beasts, levels and subzones (Classic spawns via RankedBoost; Forever may differ) ============ */
const skinReq=l=>l<=10?1:l<=20?(l-10)*10:l*5; // Classic: skill needed to skin a beast of level l
function skinPlan(c,sp){ // how this spot works for this character, or null if it doesn't
  const p=profOf(c,"Skinning");if(!p)return null;const reach=c.level+3;
  if(sp.min>reach)return null; // beasts too strong to farm
  const top=Math.min(sp.max,reach);
  let best=null;for(let l=top;l>=sp.min;l--){if(skinReq(l)<=p.skill){best=l;break}}
  if(best==null)return{sp,lockedAt:skinReq(sp.min),col:["locked","c-gray"]};
  const col=skillColor(p.skill,skinReq(best));
  return{sp,lvl:best,col,lo:sp.min,hi:top,score:(col[0]==="orange"?3:col[0]==="yellow"?2:col[0]==="green"?1:0)*100+best};
}
function skinSpots(c){
  const zs=new Set(reachZones(c).map(z=>z.name));
  return SKIN_SPOTS.filter(sp=>zs.has(sp.zone)).map(sp=>skinPlan(c,sp)).filter(x=>x&&!x.lockedAt).sort((a,b)=>b.score-a.score);
}
const skinLine=x=>`Skin ${x.sp.beasts} (about level ${x.lo}–${x.hi}) around ${andList(x.sp.spots)} for ${x.sp.leather} Leather. ${x.col[0]==="gray"?"No skill-ups for you here.":x.col[0]==="green"?"A few skill-ups left.":"Good skill-ups for you."}`;
/* ============ Zone dossiers: when, where and why, per character ============ */
const continentOf=n=>n==="Zephras Isle"?"Skywall (Skyborne start)":KALIMDOR.has(n)?"Kalimdor":"Eastern Kingdoms";
function zoneDossier(c,Zr){
  const z=ZONE[Zr.zone];const tg=S.state.toggles;const ctx=ctxAt(Date.now(),tg);
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
  if(priced.length){const best=priced.map(o=>({o,w:windows(MAT[o.name],tg,"sell",168)})).sort((a,b)=>b.w.best.s/b.w.now-a.w.best.s/a.w.now)[0];
    const g=best.w.best.s/best.w.now-1;
    when.push(g>0.05?`Sell what you gather at ${whenTxt(best.w.best.t)} (${best.o.name} ${pct(g)} vs now).`:"Sell when you're back: prices won't improve much this week.");}
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
  if(priced.length){const top=priced.sort((a,b)=>b.est.now-a.est.now)[0];const ph=perHour(top);
    why.push(`${top.name} is worth about ${plainMoney(top.est.now)} each today${ph?`, roughly ${plainMoney(ph)} an hour if you gathered only that`:""}.`);}
  else why.push("Add prices for what grows here to see what it's worth.");
  const up=Zr.items.filter(o=>o.shift>1.03).map(o=>o.name);if(up.length)why.push(`Today's conditions push ${andList(up)} up.`);
  return{when,where,why};
}
function perHour(o){const r=GATHER_RATE[o.prof];if(!r||!o.est)return null;const cut=cutFor(houseOf(char()));return Math.round(r.nodes*r.yield*o.est.now*(1-cut))}
function sellAdvice(c){
  const tg=S.state.toggles;const res=[];
  const names=[...new Set(Object.values(S.items).map(i=>i.name))];
  for(const n of names){const m=MAT[n]||{name:n,cat:"Other",tier:3};const e=estimate(n);if(!e)continue;
    const w=windows(m,tg,"sell",168);const gain=w.best.s/w.now-1;
    res.push({name:n,est:e,now:w.now,best:w.best,gain,action:gain>0.05?"hold":"list"});}
  return res.sort((a,b)=>b.gain-a.gain);
}
function needsFor(c){ // materials for profession skill-ups in the current bracket
  const out=[];
  for(const p of c.profs){const path=PATHS[p.name];if(!path)continue;
    const b=path.find(x=>p.skill>=x[0]&&p.skill<x[1])||path[path.length-1];
    const nb=path[path.indexOf(b)+1];
    for(const n of b[2])out.push({prof:p.name,name:n,bracket:b,next:nb,farm:canGather(c,n)});}
  return out;
}
function todaySuggestions(c){
  const tg=S.state.toggles;const s=[];const ctx=ctxAt(Date.now(),tg);
  const f=bestFarm(c);
  if(f&&f.top){const it=f.top.items.slice().sort((a,b)=>b.skillUp-a.skillUp||((b.est?.now||0)-(a.est?.now||0))).slice(0,3);
    const ups=it.filter(x=>x.skillUp).map(x=>x.name);
    s.push({kind:"Farm",title:`Gather in ${zl(f.top.zone)}`,body:`${it.map(x=>x.name).join(", ")}${ups.length?`. ${andList(ups)} still give${ups.length===1?"s":""} skill-ups`:""}.${ctx.weekend?" Weekend prices for raw materials run low, so hold what you gather until Tuesday to Thursday.":""}`});}
  const sa=sellAdvice(c);const listNow=sa.filter(x=>x.action==="list").slice(0,3),hold=sa.filter(x=>x.action==="hold").slice(0,2);
  if(listNow.length)s.push({kind:"Sell",title:"List now",body:listNow.map(x=>`${x.name} at about ${plainMoney(x.est.now)}`).join(", ")+". Conditions won't get meaningfully better this week."});
  if(hold.length)s.push({kind:"Hold",title:"Hold for a better window",body:hold.map(x=>`${x.name}: ${pct(x.gain)} at ${whenTxt(x.best.t)}`).join("; ")+"."});
  const needs=needsFor(c).filter(n=>!n.farm);
  if(needs.length){const n=needs[0];const m=MAT[n.name]||{name:n.name,cat:"Other",tier:3};const w=windows(m,tg,"buy",168);
    s.push({kind:"Buy",title:`Buy ${n.name} for ${n.prof}`,body:`You can't gather it in your zones yet. ${w.best.s<w.now-0.02?`Cheapest window this week: ${whenTxt(w.best.t)} (${pct(w.best.s/w.now-1)} vs now).`:"Now is as good as any time this week."} Keep it within your ${plainMoney(budgetOf(c))} budget.`});}
  for(const p of c.profs){const rb=rankBlock(c,p);if(rb){s.push({kind:rb.blocked?"Level":"Train",title:`${p.name} ${p.skill}`,body:rb.msg});break}}
  if(!c.profs.length)s.push({kind:"Tip",title:"Pick up a gathering profession",body:"Herbalism or Skinning pay from level 1 and feed everything else in this app."});
  return s;
}
function sessionPlan(c,mins){
  const tg=S.state.toggles;const steps=[];const f=bestFarm(c);const sa=sellAdvice(c);
  const listNow=sa.filter(x=>x.action==="list");const needs=needsFor(c);
  const craft=needs.filter(n=>!["Herbalism","Skinning","Mining"].includes(n.prof));
  let left=mins;
  if(listNow.length&&left>=20){steps.push({m:5,t:"Auction house",b:`List ${listNow.slice(0,4).map(x=>x.name).join(", ")}. Prices are at or near their best for the week.`});left-=5}
  if(f&&f.top){
    const share=mins<=30?left:craft.length?Math.round(left*0.7):left;
    const top=f.top.items.slice().sort((a,b)=>b.skillUp-a.skillUp||((b.est?.now||0)-(a.est?.now||0)));
    const lead=top[0];const ph=perHour(lead);const units=GATHER_RATE[lead.prof]?Math.round(GATHER_RATE[lead.prof].nodes*GATHER_RATE[lead.prof].yield*share/60):null;
    steps.push({m:share,t:`Gather in ${zl(f.top.zone)}`,b:`Loop for ${top.slice(0,3).map(x=>x.name).join(", ")}.${units?` Expect roughly ${units} ${{Herbalism:"herbs",Skinning:"skins",Mining:"ore"}[lead.prof]}${ph?`, worth about ${plainMoney(ph*share/60)} if they were all ${lead.name}`:""}.`:""}${lead.skillUp?" Skill-ups on the way.":""}`});
    left-=share;
  }
  if(craft.length&&left>=10){const n=craft[0];steps.push({m:left,t:`Level ${n.prof}`,b:`Spend ${n.bracket[2].join(" and ")} on ${n.prof} skill-ups (${n.bracket[0]}-${n.bracket[1]}).${n.farm?" You can gather these yourself.":" Buy them in a cheap window if you're short."}`});left=0}
  if(left>=10)steps.push({m:left,t:"Quest and skin as you go",b:"Spend the rest leveling. Gather every node and skinnable mob on your route."});
  if(!steps.length)steps.push({m:mins,t:"Level up",b:"Add professions to your character to get a tailored plan."});
  return steps;
}

function houseOf(c){return c.faction==="Alliance"?"Alliance":"Horde"}
function cutFor(house){return (HOUSES[house]||HOUSES.Horde).cut}
function skillColor(skill,req){if(skill<req)return["locked","c-gray"];const d=skill-req;if(d<25)return["orange","c-orange"];if(d<50)return["yellow","c-yellow"];if(d<100)return["green","c-green"];return["gray","c-gray"]}

/* ============ Backup: export and import (src/engine/backup.ts) ============ */

/* ============ App state ============ */
const S={
  state:{characters:[{id:"ex",name:"Example rogue",cls:"Rogue",level:15,faction:"Alliance",region:"us",gold:null,stretch:2,profs:[{name:"Herbalism",skill:90},{name:"Skinning",skill:80}],example:true}],activeId:"ex",toggles:{}},
  items:{},tab:"today",sample:null,brief:null,mins:60,q:""
};
const char=()=>S.state.characters.find(c=>c.id===S.state.activeId)||S.state.characters[0];
function saveState(){return Store.save("state",S.state)}

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
  </section>${inClaude()?`
  <section class="card">
    <div class="row between"><h2>Written plan</h2><button class="btn small" type="button" data-act="brief">Ask Claude</button></div>
    <div id="briefOut" class="out small muted">${S.brief?esc(S.brief):"Optional. One short Claude call that turns the suggestions above into a plan. Everything else on this page uses no Claude."}</div>
  </section>`:""}`;
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
    <p class="small muted" style="margin:0">${Store.mode==="db"?"Saved privately to your account, so it follows you across devices.":inClaude()?"Saved on this device only. Sign in to claude.ai to sync across devices.":"Saved on this device only. Use Backup below to move it to another device."}</p>
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
  const d=backupData(b),stale=staleKeys(S.items,d.items);
  S.state=d.state;S.items=d.items;S.brief=null;S.pendingImport=null;
  cacheLocal();
  if(Store.mode!=="db")return;
  try{
    await Promise.all([saveState(),...Object.keys(S.items).map(k=>Store.save(k,S.items[k])),...stale.map(k=>Store.remove(k))]);
  }catch(e){toast("Imported on this device. Your claude.ai copy may be out of date until the next save.")}
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


/* ============ Claude brief (optional, one short call) ============ */
async function getSample(){if(S.sample!==null)return S.sample;try{S.sample=(window.claude&&await claude.use("sample"))||false}catch(e){S.sample=false}return S.sample}
async function doBrief(){
  const out=$("#briefOut");const s=await getSample();
  if(!s){out.textContent="Claude isn't available in this view.";return}
  const c=char();const sug=todaySuggestions(c).map(x=>`${x.kind}: ${x.title}. ${x.body}`).join("\n");
  const ctx=ctxAt(Date.now(),S.state.toggles);
  const prompt=`Rewrite these WoW: Forever suggestions as a friendly plan of at most 5 short "• " bullets for a level ${c.level} ${c.cls} (${c.profs.map(p=>p.name+" "+p.skill).join(", ")||"no professions"}, budget ${plainMoney(budgetOf(c))}). Keep every number and zone exactly as given. Add nothing that isn't below. No market manipulation.
Conditions: day ${ctx.days} since launch, ${ctx.weekend?"weekend":"weekday"}.
${sug}`;
  out.textContent="Thinking…";
  try{const r=await s(prompt,{modelTier:"quick",onText:({text})=>{out.textContent=text}});S.brief=r.text;out.textContent=r.text}
  catch(e){out.textContent=e&&e.code==="rate_limited"?"Claude is busy. Try again in a minute.":"Couldn't get a plan right now."}
}

/* ============ Actions ============ */
document.addEventListener("click",e=>{
  if(e.target.id==="sheet"){closeSheet();return}
  const el=e.target.closest("[data-tab],[data-act],[data-mat]");if(!el)return;
  if(el.dataset.tab){S.tab=el.dataset.tab;render();return}
  if(el.dataset.mat&&!el.dataset.act){sheetMat(el.dataset.mat);return}
  const a=el.dataset.act;
  if(a==="close")closeSheet();
  else if(a==="brief")doBrief();
  else if(a==="mins"){S.mins=+el.dataset.m;render()}
  else if(a==="clearPrices"){deletePrices(el.dataset.name).then(()=>{closeSheet();render();toast("Prices deleted")})}
  else if(a==="editChar")sheetChar(el.dataset.id);
  else if(a==="exportData")showExport();
  else if(a==="copyBackup")copyBackup();
  else if(a==="checkImport")checkImport();
  else if(a==="cancelImport")cancelImport();
  else if(a==="applyImport"&&S.pendingImport){applyBackup(S.pendingImport).then(()=>{closeSheet();render();toast("Backup imported")})}
  else if(a==="useChar"){S.state.activeId=el.dataset.id;S.brief=null;saveState();closeSheet();render()}
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
  setTimeout(async()=>{
    await Store.init();if(Store.mode!=="db")return;
    try{
      const d=await Store.load();
      if(d&&d.state){S.state=Object.assign({toggles:{}},d.state);S.items=clean(d.items);
        // drop leftovers from the old import-based version
        for(const k of Object.keys(d.items))if(!S.items[k])Store.remove(k);
        cacheLocal();render()}
    }catch(e){toast("Couldn't reach your saved data. Showing what's on this device.")}
  },0);
})();

// Test hook: as a module, the script's functions are no longer globals, so the behavior lock
// (tests/e2e/capture.ts) reads them from here. Same names and signatures as the single file.
window.__fml = {char, reachZones, budgetOf, gatherOptions, bestFarm, skinSpots, zoneDossier,
  sellAdvice, needsFor, todaySuggestions, sessionPlan, shiftAt, windows, estimate, MATS, S};
