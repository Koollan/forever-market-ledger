// Event handling: tabs, sheet buttons, search typing, Escape, and error toasts
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
import { ICONS, TABS, renderNav, renderHeader, banners, render, KIND_PILL, vToday, vFarm, vPrices, vSkills, vPlan } from "./views";
import { openSheet, closeSheet, sheetMat, sheetChar, sheetChars, plural, checkImport, cancelImport, applyBackup, showExport, copyBackup } from "./sheets";

/** Wires up clicks, typing and keys for the whole app. Called once by main.ts. */
export function bindActions(){
  document.addEventListener("click",(e: any)=>{
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
  document.addEventListener("input",(e: any)=>{if(e.target.id==="matQ"){S.q=e.target.value;const pos=e.target.selectionStart;render();const i=$("#matQ");if(i){i.focus();try{i.setSelectionRange(pos,pos)}catch(_){}}}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeSheet()});
  $("#charBtn").addEventListener("click",sheetChars);
  window.addEventListener("error",(e: any)=>toast("Something broke: "+(e.message||"unknown error")));
  window.addEventListener("unhandledrejection",(e: any)=>toast("Something broke: "+((e.reason&&e.reason.message)||e.reason||"unknown error")));
}
