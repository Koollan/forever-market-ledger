// Process or sell (T9): compare selling materials raw with selling what the character can make from them.
// Pure: takes the character and a context of {now, items, toggles, market?}; reads no clock or storage.
// Recipes and vendor prices: src/data/recipes.ts. Design: planning/process-or-sell/design/detailed-design.md.
import { RECIPES, VENDOR, type Recipe } from "../data/recipes";
import { estimate } from "./estimate";
import { profOf, skillColor, cutFor, houseOf } from "./character";
import { andList } from "./util";
import type { Character } from "./types";
import type { SugCtx } from "./suggestions";

export const PROCESS_MIN_GAIN = 0.10; // processing must keep more than 10% more than selling raw…
export const PROCESS_MIN_COPPER = 100; // …and at least 1 silver more per craft

export type Count = [name: string, count: number];
export type Route = { steps: Recipe[]; ins: Count[]; vendor: Count[]; out: string; n: number };
export type Compared = Route & {
  keepRaw: number | null; keepProcess: number | null; // copper kept per craft after the cut; null if unpriced
  diff: number | null; gain: number | null; // keepProcess − keepRaw, and that as a fraction of keepRaw
  vendorCost: number; missing: string[]; verdict: "process" | "sell" | "unpriced"; skillUp: boolean;
};

// Can the character make this recipe now? Profession and skill, and for Dark Iron, level + zone reach.
export function canMake(c: Character, r: Recipe): boolean {
  const p = profOf(c, r.prof);
  if (!p || p.skill < r.skill) return false;
  return r.minLevel == null || c.level + (c.stretch ?? 2) >= r.minLevel;
}

const merge = (xs: Count[]): Count[] => {
  const m = new Map<string, number>();
  for (const [n, k] of xs) m.set(n, (m.get(n) ?? 0) + k);
  return [...m.entries()];
};
const scale = (xs: Count[] | undefined, f: number): Count[] => (xs ?? []).map(([n, k]) => [n, k * f]);

// Every way to make each makeable recipe from one step back: each input another makeable recipe produces may
// be made first (expanded into that recipe's inputs) or used as it is. Never deeper than two steps.
function allRoutes(c: Character): Route[] {
  const ok = RECIPES.filter((r) => canMake(c, r));
  const byOut = new Map(ok.map((r) => [r.out, r]));
  const out: Route[] = [];
  for (const r2 of ok) {
    let variants: { steps: Recipe[]; ins: Count[]; vendor: Count[] }[] = [{ steps: [], ins: [], vendor: [...(r2.vendor ?? [])] }];
    for (const [name, k] of r2.ins) {
      const r1 = byOut.get(name);
      const next = variants.map((v) => ({ ...v, ins: [...v.ins, [name, k] as Count] }));
      if (r1) for (const v of variants)
        next.push({ steps: [...v.steps, r1], ins: [...v.ins, ...scale(r1.ins, k / r1.n)], vendor: [...v.vendor, ...scale(r1.vendor, k / r1.n)] });
      variants = next;
    }
    for (const v of variants) out.push({ steps: [...v.steps, r2], ins: merge(v.ins), vendor: merge(v.vendor), out: r2.out, n: r2.n });
  }
  return out;
}

// The routes that use `name` as an input, one or two steps
export function routesFrom(name: string, c: Character): Route[] {
  return allRoutes(c).filter((r) => r.ins.some(([n]) => n === name));
}

const last = (r: Route) => r.steps[r.steps.length - 1];

// Skill-ups come from the last step: orange or yellow by the source's colors, else the app's Classic colors
function givesSkillUp(c: Character, r: Recipe): boolean {
  const s = profOf(c, r.prof)?.skill ?? 0;
  if (r.colors && r.colors[2] > r.skill) return s < r.colors[1];
  const col = skillColor(s, r.skill)[0];
  return col === "orange" || col === "yellow";
}

// Gold kept per craft both ways, after the home house's cut, at the price now (API p10 or your price)
export function compareRoute(route: Route, c: Character, x: SugCtx): Compared {
  const cut = cutFor(houseOf(c));
  const api = { market: x.market ?? null, character: c };
  const price = (n: string) => estimate(n, x.items, x.toggles, x.now, api)?.now ?? null;
  const missing: string[] = [];
  let raw = 0;
  for (const [n, k] of route.ins) { const p = price(n); if (p == null) missing.push(n); else raw += k * p; }
  const outPrice = price(route.out);
  if (outPrice == null) missing.push(route.out);
  const vendorCost = Math.round(route.vendor.reduce((a, [n, k]) => a + k * (VENDOR[n]?.price ?? 0), 0));
  const skillUp = givesSkillUp(c, last(route));
  if (missing.length) return { ...route, keepRaw: null, keepProcess: null, diff: null, gain: null, vendorCost, missing, verdict: "unpriced", skillUp };
  const keepRaw = Math.round(raw * (1 - cut));
  const keepProcess = Math.round(route.n * (outPrice as number) * (1 - cut)) - vendorCost;
  const diff = keepProcess - keepRaw;
  const gain = keepRaw > 0 ? diff / keepRaw : null;
  const wins = diff >= PROCESS_MIN_COPPER && (keepRaw <= 0 || diff > PROCESS_MIN_GAIN * keepRaw);
  return { ...route, keepRaw, keepProcess, diff, gain, vendorCost, missing, verdict: wins ? "process" : "sell", skillUp };
}

const order = (a: Compared, b: Compared) =>
  (a.verdict === "unpriced" ? 1 : 0) - (b.verdict === "unpriced" ? 1 : 0) || (b.diff ?? 0) - (a.diff ?? 0);

const compareAll = (name: string, c: Character, x: SugCtx) => routesFrom(name, c).map((r) => compareRoute(r, c, x)).sort(order);

// The best route to each output from one material, best first, unpriced last (the material sheet)
export function processOptions(name: string, c: Character, x: SugCtx): Compared[] {
  const seen = new Set<string>();
  return compareAll(name, c, x).filter((o) => !seen.has(o.out) && seen.add(o.out));
}

// For each material held (what you priced or gather), the best route worth processing whose inputs are all
// held: no buying to craft (Q5, Q14). Best gain in copper first.
export function processAdviceFrom(held: string[], c: Character, x: SugCtx): (Compared & { name: string })[] {
  const have = new Set(held);
  const res: (Compared & { name: string })[] = [];
  for (const name of held) {
    const best = compareAll(name, c, x).find((o) => o.verdict === "process" && o.ins.every(([n]) => have.has(n)));
    if (best) res.push({ name, ...best });
  }
  return res.sort((a, b) => (b.diff ?? 0) - (a.diff ?? 0));
}

// Text helpers shared by the UI and Today
const num = (k: number) => String(Math.round(k * 100) / 100);
export const verbOf = (r: Route) => {
  const vs = [...new Set(r.steps.map((s) => s.verb))];
  return vs.map((v, i) => (i ? v.toLowerCase() : v)).join(" and ");
};
export const routeLabel = (r: Route) => `${verbOf(r)} ${r.ins.map(([n, k]) => `${num(k)} ${n}`).join(" + ")} → ${num(r.n)} ${r.out}`;
export const routeShort = (r: Route) => `${verbOf(r)} ${andList(r.ins.map(([n]) => n))} into ${r.out}`;
// Notes: recipe knowledge (with its source when `long`), where, cooldown, skill-ups
export function routeNotes(r: Compared, long: boolean): string[] {
  const notes: string[] = [];
  for (const s of r.steps) if (s.learn !== "trainer") notes.push(long ? `if you know the recipe (${s.learn})` : "if you know the recipe");
  for (const s of r.steps) if (s.where) notes.push(`at ${s.where}`);
  for (const s of r.steps) if (s.cooldown) notes.push(s.cooldown);
  if (r.skillUp) notes.push("also gives skill-ups");
  return [...new Set(notes)];
}
