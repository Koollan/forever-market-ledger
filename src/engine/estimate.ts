// Price estimates from the prices you entered. Pure: takes the prices, switches and time as arguments.
import { MAT } from "../data/materials";
import { shiftAt, type Toggles, type Why } from "./conditions";
import { keyOf, median } from "./util";
import { activePrice, type Market } from "./market";
import type { Character, Items, PriceEntry } from "./types";

// `source` is set only for API prices, so estimates from your own prices keep their recorded shape
export type Estimate = { base: number; now: number; mult: number; why: Why[]; n: number; last: PriceEntry; source?: "api" };
export type ApiCtx = { market: Market | null; character: Character };

// Base value = your observations with each one's conditions removed; estimate = base x conditions now
// With `api`, an API price (see activePrice) is the price now and its base is that price with today's
// conditions removed, so the same windows apply on top. Without one, nothing changes.
export function estimate(name: string,items: Items,toggles: Toggles|undefined,when: number,api?: ApiCtx): Estimate|null{
  const m=MAT[name]||{name,cat:"Other",tier:3};
  const a=api?activePrice(name,{items,market:api.market,character:api.character,now:when}):null;
  if(a&&a.source==="api"){const s=shiftAt(m,when,toggles);return{base:a.price/s.mult,now:a.price,mult:s.mult,why:s.why,n:1,last:{t:a.at,price:a.price},source:"api"}}
  const it=items[keyOf(name)]||null;if(!it||!it.hist?.length)return null;
  const tg=toggles;
  const bases=it.hist.map((p: PriceEntry)=>p.price/shiftAt(m,p.t,tg).mult);
  const base=median(bases) as number;const s=shiftAt(m,when,tg);
  return{base,now:Math.round(base*s.mult),mult:s.mult,why:s.why,n:it.hist.length,last:it.hist[it.hist.length-1]};
}
