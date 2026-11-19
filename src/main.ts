// Entry point: styles, boot from this device's saved data, wire up events, first render.
import "./styles.css";
import { MATS } from "./data/materials";
import { reachZones, budgetOf } from "./engine/farm";
import { needsFor } from "./engine/character";
import { skinSpots } from "./engine/skinning";
import { shiftAt } from "./engine/conditions";
import { S, char, readLocal, gatherOptions, bestFarm, zoneDossier, sellAdvice, todaySuggestions, sessionPlan, windows, estimate } from "./ui/state";
import { render } from "./ui/views";
import { bindActions } from "./ui/actions";

bindActions();
/* ============ Boot ============ */
(function boot(){
  const loc=readLocal();
  const clean=(items: any)=>Object.fromEntries(Object.entries(items||{}).filter(([k,v]: [string, any])=>v&&Array.isArray(v.hist)&&v.hist.every((p: any)=>p.price!=null)));
  if(loc&&loc.state){S.state=Object.assign(S.state,loc.state,{toggles:loc.state.toggles||{}});S.items=clean(loc.items) as any}
  render();
})();

// Test hook: as a module, the script's functions are no longer globals, so the behavior lock
// (tests/e2e/capture.ts) reads them from here. Same names and signatures as the single file.
(window as any).__fml = {char, reachZones, budgetOf, gatherOptions, bestFarm, skinSpots, zoneDossier,
  sellAdvice, needsFor, todaySuggestions, sessionPlan, shiftAt, windows, estimate, MATS, S};
