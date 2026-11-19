// Price estimates from the prices you entered. Pure: takes the prices, switches and time as arguments.
import { MAT } from "../data/materials";
import { shiftAt, type Toggles, type Why } from "./conditions";
import { keyOf, median } from "./util";
import type { Items, PriceEntry } from "./types";

export type Estimate = { base: number; now: number; mult: number; why: Why[]; n: number; last: PriceEntry };

// Base value = your observations with each one's conditions removed; estimate = base x conditions now
export function estimate(name: string,items: Items,toggles: Toggles|undefined,when: number): Estimate|null{
  const m=MAT[name]||{name,cat:"Other",tier:3};const it=items[keyOf(name)]||null;if(!it||!it.hist?.length)return null;
  const tg=toggles;
  const bases=it.hist.map((p: PriceEntry)=>p.price/shiftAt(m,p.t,tg).mult);
  const base=median(bases) as number;const s=shiftAt(m,when,tg);
  return{base,now:Math.round(base*s.mult),mult:s.mult,why:s.why,n:it.hist.length,last:it.hist[it.hist.length-1]};
}
