// App state, this device's storage, prices you enter, and the clock-bound engine calls the views use
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
import { validateBackup, buildBackup, backupData, type Backup } from "../engine/backup";
import type { AppState, Items, Character } from "../engine/types";
import type { Market } from "../engine/market";
import { ICONS, TABS, renderNav, renderHeader, banners, render, KIND_PILL, vToday, vFarm, vPrices, vSkills, vPlan } from "./views";
import { openSheet, closeSheet, sheetMat, sheetChar, sheetChars, plural, checkImport, cancelImport, applyBackup, showExport, copyBackup } from "./sheets";
import { bindActions } from "./actions";

/* ============ Helpers ============ */
export const $=(s: string): any=>document.querySelector(s);
export function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<60)return m+"m ago";const h=Math.round(m/60);if(h<48)return h+"h ago";return Math.round(h/24)+"d ago"}
let toastTimer: any;
export function toast(msg){const t=$("#toast");t.textContent=msg;t.style.display="block";clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.style.display="none",3200)}
export const uid8=()=>Math.random().toString(36).slice(2,10);

/* ============ Storage: this device only (localStorage) ============ */
export function cacheLocal(){try{localStorage.setItem("fml-cache",JSON.stringify({state:S.state,items:S.items}))}catch(e){}}
export function readLocal(){try{return JSON.parse(localStorage.getItem("fml-cache")||"null")}catch(e){return null}}


/* ============ Materials catalog ============ */

/* ============ Conditions engine and estimates (src/engine) ============ */
// Old signatures read the clock and app state here, so behavior is unchanged while call sites move
export const windows=(m,toggles,mode,hours)=>windowsAt(m,toggles,mode,hours,Date.now());
export const whenTxt=t=>whenTxtAt(t,Date.now());
export const perHour=o=>perHourOf(o,char());
export const zoneDossier=(c,Zr)=>zoneDossierAt(c,Zr,Date.now(),S.state.toggles);
// Suggestions read the clock and app state here; the engine takes them as a context
export const cx=()=>({now:Date.now(),items:S.items,toggles:S.state.toggles,market:S.market});
export const gatherOptions=c=>gatherOptionsAt(c,cx());
export const bestFarm=c=>bestFarmAt(c,cx());
export const sellAdvice=c=>sellAdviceAt(c,cx());
export const todaySuggestions=c=>todaySuggestionsAt(c,cx());
export const sessionPlan=(c,mins)=>sessionPlanAt(c,mins,cx());
export const estimate=(name,when?)=>estimateAt(name,S.items,S.state.toggles,when||Date.now(),{market:S.market,character:char()});

/* ============ Prices you enter ============ */
export function itemFor(name){return S.items[keyOf(name)]||null}
export function lastPrice(name){const it=itemFor(name);const h=it?.hist||[];return h.length?h[h.length-1]:null}
export async function recordPrice(name,copper){
  const key=keyOf(name);const it=S.items[key]||{key,name,hist:[]};
  it.hist=(it.hist||[]).filter(p=>Date.now()-p.t>10*6e4).concat([{t:Date.now(),price:copper}]).slice(-60);
  S.items[key]=it;cacheLocal();
}
export async function deletePrices(name){const key=keyOf(name);delete S.items[key];cacheLocal()}

/* ============ Character helpers ============ */

/* ============ Suggestions (pre-written, filled from rules) ============ */
/* ============ Skinning spots: beasts, levels and subzones (Classic spawns via RankedBoost; Forever may differ) ============ */
/* ============ Zone dossiers: when, where and why, per character ============ */
/* ============ Backup: export and import (src/engine/backup.ts) ============ */

/* ============ App state ============ */
// market: API prices loaded for pricesSeries (src/ui/live.ts); null until loaded, offline with no cache, or EU
export const S: { state: AppState; items: Items; tab: string; mins: number; q: string; pendingImport?: Backup|null; market: Market|null; pricesSeries?: string|null }={
  state:{characters:[{id:"ex",name:"Example rogue",cls:"Rogue",level:15,faction:"Alliance",region:"us",gold:null,stretch:2,profs:[{name:"Herbalism",skill:90},{name:"Skinning",skill:80}],example:true}],activeId:"ex",toggles:{}},
  items:{},tab:"today",mins:60,q:"",market:null
};
export const char=(): Character=>S.state.characters.find(c=>c.id===S.state.activeId)||S.state.characters[0];
export function saveState(){cacheLocal();return Promise.resolve()}
