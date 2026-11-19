// Bottom sheets: a material's prices, the character list and editor, and Backup (export / import)
import { CLASSES, PROFS, CONS_TAGS } from "../data/classes";
import { GATHER, SMELT, GATHER_RATE } from "../data/gathering";
import { ZONES, ZONE, STONE_OF, LEATHER_TIERS, SKIN_SPECIAL, KALIMDOR, DENSITY } from "../data/zones";
import { CONSUMABLES, HOUSES } from "../data/consumables";
import { RULESETS, rulesetOf } from "../data/rulesets";
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
import { ICONS, TABS, renderNav, renderHeader, banners, render, KIND_PILL, vToday, vFarm, vPrices, vSkills, vPlan } from "./views";
import { bindActions } from "./actions";
import { activePrice, blackwaterHint, history, homeSeries } from "../engine/market";
import { processOptions } from "./state";
import { routeLabel, routeNotes, verbOf } from "../engine/process";
import { sparkPath } from "./spark";

/* ============ Sheets ============ */
export function openSheet(html){$("#sheetPanel").innerHTML=html;$("#sheet").classList.add("open");$("#sheetPanel").scrollTop=0}
export function closeSheet(){$("#sheet").classList.remove("open");S.openMat=null}
// Process or sell (T9): each route the character can make from this material, gold kept per craft both ways
function procSection(name,c){
  const po=processOptions(name,c);if(!po.length)return "";
  return `<h3>Process or sell</h3><div class="list process">${po.map(o=>{
    const pill=o.verdict==="process"?`<span class="pill good">${esc(verbOf(o))} first</span>`:o.verdict==="sell"?'<span class="pill">Sell raw</span>':'<span class="pill">No price</span>';
    const line=o.verdict==="unpriced"?`No price for ${andList(o.missing)} yet: add one to compare.`
      :`Keep ${plainMoney(o.keepProcess)} processed vs ${plainMoney(o.keepRaw)} selling raw${o.gain!=null?` (${pct(o.gain)})`:""}, per craft after the cut${o.vendorCost?` and ${plainMoney(o.vendorCost)} of vendor reagents`:""}.${o.verdict==="sell"&&(o.diff??0)>0?" Not worth it: processing pays when it keeps over 10% and at least 1s more.":""}`;
    const others=o.ins.map(i=>i[0]).filter(n=>n!==name);
    const notes=[...(others.length?[`also uses ${andList(others)}`]:[]),...routeNotes(o,true)];
    return `<div class="item"><span class="nm">${esc(routeLabel(o))}</span><span class="right">${pill}</span><span class="meta small">${esc(line)}${notes.length?`<br><span class="muted">${esc(notes.join(" · "))}</span>`:""}</span></div>`}).join("")}</div>`;
}
export function sheetMat(name){
  S.openMat=name;
  const c=char();const m=MAT[name]||{name,cat:"Other",tier:3};const tg=S.state.toggles;
  // API prices (T3): the active price and where it came from, the home series' last 24 hours, Blackwater
  const now=Date.now(),api={market:S.market,character:c};const e=estimateAt(name,S.items,tg,now,api);
  const a=activePrice(name,{items:S.items,market:S.market,character:c,now});const series=homeSeries(c);
  const line=series?history(name,series,S.market,now):[];const path=sparkPath(line,300,40);
  const hints=(["sell","buy"] as const).map(md=>blackwaterHint(name,md,api)).filter(Boolean);
  const s=shiftAt(m,Date.now(),tg);const ws=windows(m,tg,"sell",168),wb=windows(m,tg,"buy",168);
  const g=canGather(c,name);const it=itemFor(name);
  const hist=(it?.hist||[]).slice().reverse();
  openSheet(`
    <div class="row between"><h2>${esc(name)}</h2><button class="btn small" type="button" data-act="close">Close</button></div>
    <div class="btns"><span class="pill">${esc(m.cat)} · tier ${m.tier}</span>${g?`<span class="pill good">You can ${g.smelt?"mine and smelt":"gather"} it</span>`:""}</div>
    <div class="stat">
      <div><b>${a?plainMoney(a.price):e?plainMoney(e.now):"—"}</b><span>${a?`${a.source==="api"?`API${rulesetOf(c.ruleset)?" "+esc(rulesetOf(c.ruleset).name):""}`:"You"} · ${ago(a.at)}`:"estimate now"}</span></div>
      <div><b>${pct(s.mult-1)}</b><span>today vs normal</span></div>
      <div><b>${it?.hist?.length||0}</b><span>prices entered</span></div>
    </div>
    ${a?.row?`<p class="small muted" style="margin:0">min ${esc(plainMoney(a.row[0]))} · median ${esc(plainMoney(a.row[3]))} · ${(a.row[4]??0).toLocaleString()} listed${a.stale?" · prices are over 3 h old":""}</p>`:""}
    ${path?`<figure class="pline"><svg viewBox="0 0 300 40" preserveAspectRatio="none" role="img" aria-label="Price, last 24 hours"><path d="${path}"/></svg><figcaption class="small muted"><span>24 h ago</span><span>now</span></figcaption></figure>`:""}
    ${hints.map(h=>`<div class="banner bw">${h.mode==="sell"?`Blackwater: ${esc(plainMoney(h.price))} after its 15% cut, ${Math.round(h.pct*100)}% better than your faction house.`:`Blackwater: ${esc(plainMoney(h.price))}, ${Math.round(h.pct*100)}% cheaper than your faction house.`}</div>`).join("")}
    ${(c.region||"us")!=="us"?'<p class="small muted" style="margin:0">API prices are US only for now.</p>':""}
    <div class="banner">${ws.best.s>ws.now*1.03?`Sell: wait for ${esc(whenTxt(ws.best.t))} (${pct(ws.best.s/ws.now-1)} vs now).`:"Sell: now is about as good as this week gets."} ${wb.best.s<wb.now*0.97?`Buy: ${esc(whenTxt(wb.best.t))} is cheapest (${pct(wb.best.s/wb.now-1)}).`:"Buy: no better window this week."}</div>
    ${s.why.length?`<p class="small muted" style="margin:0">${esc(s.why.map(w=>`${pct(w.p/100)} ${w.why}`).join(" · "))}</p>`:""}
    ${procSection(name,c)}
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
export function sheetChar(id){
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
      <label for="cRule">Ruleset<select id="cRule"><option value="" ${rulesetOf(c.ruleset)?"":"selected"}>Not set (all rulesets pooled)</option>${RULESETS.map(r=>`<option value="${r.key}" ${c.ruleset===r.key?"selected":""}>${esc(r.name)}</option>`).join("")}</select></label>
      <p class="small muted" style="margin:0">Each ruleset has its own auction houses, so prices come from yours. Which house belongs to which ruleset is still an estimate.</p>
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
    const nc={id:id==="new"||c.example?uid8():c.id,name:$("#cName").value.trim()||"Unnamed",cls:$("#cCls").value,level:Math.max(1,Math.min(60,+$("#cLvl").value||1)),faction:$("#cFac").value,region:$("#cReg").value,ruleset:rulesetOf($("#cRule").value)?.key,skyborne:$("#cSky").checked,
      gold:$("#cGold").value===""?null:Math.round(Math.max(0,+$("#cGold").value)*10000),stretch:+$("#cStretch").value,
      profs:[...document.querySelectorAll<HTMLInputElement>("[data-prof]")].filter(i=>i.value!=="").map(i=>({name:i.dataset.prof,skill:Math.max(0,Math.min(300,+i.value))}))};
    const list=S.state.characters.filter(x=>!x.example&&x.id!==c.id);
    list.push(nc);S.state.characters=list;S.state.activeId=nc.id;
    saveState();closeSheet();render();toast("Character saved");
  });
}
export function sheetChars(){
  openSheet(`
    <div class="row between"><h2>Characters</h2><button class="btn small" type="button" data-act="close">Close</button></div>
    <div class="list">${S.state.characters.map(c=>`<div class="item"><span class="nm"><i class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${CLASSES[c.cls]?.c}"></i> ${esc(c.name)}</span>
      <span class="right"><span class="btns"><button class="btn small ${c.id===S.state.activeId?"primary":""}" type="button" data-act="useChar" data-id="${esc(c.id)}">${c.id===S.state.activeId?"Active":"Use"}</button><button class="btn small" type="button" data-act="editChar" data-id="${esc(c.id)}">Edit</button></span></span>
      <span class="meta small muted">Level ${c.level} ${esc(c.cls)} · ${esc(c.faction)}${rulesetOf(c.ruleset)?` · ${esc(rulesetOf(c.ruleset).name)}`:""} · ${c.profs.map(p=>esc(p.name)+" "+p.skill).join(", ")||"no professions"}</span></div>`).join("")}</div>
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
export const plural=(n,w)=>n+" "+w+(n===1?"":"s");
export function checkImport(){
  const box=$("#bkConfirm");if(!box)return;
  const r=validateBackup($("#bkIn").value);
  box.hidden=false;
  if(!r.ok){S.pendingImport=null;box.innerHTML=`<p class="small" style="margin:0">${esc((r as { error: string }).error)}</p>`;return}
  S.pendingImport=r.backup;
  box.innerHTML=`<p style="margin:0"><b>Replace with ${plural(r.counts.characters,"character")} and ${plural(r.counts.prices,"price")}?</b></p>
    <p class="small muted" style="margin:0">The characters and prices on this device are removed.</p>
    <div class="btns"><button class="btn primary" type="button" data-act="applyImport">Replace</button><button class="btn" type="button" data-act="cancelImport">Cancel</button></div>`;
}
export function cancelImport(){S.pendingImport=null;const box=$("#bkConfirm");if(box){box.hidden=true;box.innerHTML=""}}
export async function applyBackup(b){
  const d=backupData(b);
  S.state=d.state;S.items=d.items;S.pendingImport=null;
  cacheLocal();
}
export function showExport(){
  const box=$("#bkExport"),out=$("#bkOut");if(!box||!out)return;
  out.value=JSON.stringify(buildBackup(S.state,S.items,Date.now()),null,1);
  box.hidden=false;$("#bkMsg").textContent="";
}
export async function copyBackup(){
  const out=$("#bkOut"),msg=$("#bkMsg");if(!out)return;
  try{await navigator.clipboard.writeText(out.value);msg.textContent="Copied. Paste it somewhere safe, or into Import on your other device."}
  catch(e){out.focus();out.select();msg.textContent="Copy is blocked here. The text is selected: copy it by hand (Ctrl+C, or long-press on a phone)."}
}
