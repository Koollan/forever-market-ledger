// Backup: export and import all saved data as versioned JSON (T1). Pure: no DOM, storage or clock.
import { CLASSES } from "../data/classes";
import type { AppState, Character, Items } from "./types";

export const BACKUP_APP = "forever-market-ledger";
export const BACKUP_VERSION = 1;

export type Backup = {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: number | null;
  characters: Character[];
  activeId: string;
  toggles: Record<string, unknown>;
  prices: Items;
};

export type ValidateResult =
  | { ok: true; backup: Backup; counts: { characters: number; prices: number } }
  | { ok: false; error: string };

const CHARACTER_FIELDS = ["id", "name", "cls", "level", "faction", "region", "gold", "stretch", "skyborne", "example"] as const;
const isObject = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);

/** Checks a pasted backup as a whole. Any problem returns one plain message; nothing is partly accepted. */
export function validateBackup(text: string): ValidateResult {
  let b: any;
  try {
    b = JSON.parse(text);
  } catch {
    return { ok: false, error: "That isn't a complete backup. Copy the whole text from Export and try again." };
  }
  const fail = (error: string): ValidateResult => ({ ok: false, error });
  if (!isObject(b) || b.app !== BACKUP_APP) return fail("This isn't a Forever Market Ledger backup.");
  if (!Number.isInteger(b.version) || b.version < 1) return fail("This isn't a Forever Market Ledger backup.");
  if (b.version > BACKUP_VERSION) return fail("This backup is from a newer version of the app. Update the app and try again.");
  if (!Array.isArray(b.characters) || !b.characters.length) return fail("This backup has no characters.");
  for (let i = 0; i < b.characters.length; i++) {
    const c = b.characters[i], n = "Character " + (i + 1);
    if (!c || typeof c !== "object") return fail(n + " is damaged.");
    if (typeof c.id !== "string" || !c.id) return fail(n + " has no id.");
    if (typeof c.name !== "string" || !c.name) return fail(n + " has no name.");
    if (!Object.hasOwn(CLASSES, c.cls)) return fail(n + " has an unknown class.");
    if (!Number.isInteger(c.level) || c.level < 1 || c.level > 60) return fail(n + " has an invalid level.");
    if (c.faction !== "Alliance" && c.faction !== "Horde") return fail(n + " has no faction.");
    const profsOk = Array.isArray(c.profs) && c.profs.every((p: any) =>
      p && typeof p.name === "string" && Number.isFinite(p.skill) && p.skill >= 0 && p.skill <= 300);
    if (!profsOk) return fail(n + " has invalid professions.");
  }
  if (!b.characters.some((c: any) => c.id === b.activeId)) return fail("The active character isn't in this backup.");
  if (!isObject(b.prices)) return fail("The price list in this backup is damaged.");
  for (const [k, it] of Object.entries<any>(b.prices)) {
    const ok = it && typeof it.name === "string" && it.name && Array.isArray(it.hist) &&
      it.hist.every((p: any) => p && Number.isFinite(p.t) && Number.isFinite(p.price) && p.price >= 0);
    if (!ok) return fail("The prices for " + (it && typeof it.name === "string" && it.name ? it.name : k) + " are damaged.");
  }

  // Keep only known fields, so a backup never carries unknown data into the app
  const pick = (o: any, keys: readonly string[]) =>
    Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
  const backup: Backup = {
    app: BACKUP_APP,
    version: b.version,
    exportedAt: Number.isFinite(b.exportedAt) ? b.exportedAt : null,
    characters: b.characters.map((c: any) => Object.assign(pick(c, CHARACTER_FIELDS),
      { profs: c.profs.map((p: any) => ({ name: p.name, skill: p.skill })) }) as Character),
    activeId: b.activeId,
    toggles: isObject(b.toggles) ? b.toggles : {},
    prices: Object.fromEntries(Object.entries<any>(b.prices).map(([k, it]) =>
      [k, { key: k, name: it.name, hist: it.hist.map((p: any) => ({ t: p.t, price: p.price })) }])),
  };
  return { ok: true, backup, counts: { characters: backup.characters.length, prices: Object.keys(backup.prices).length } };
}

/** A validated backup as the app's own data. */
export function backupData(b: Backup): { state: AppState; items: Items } {
  return JSON.parse(JSON.stringify({
    state: { characters: b.characters, activeId: b.activeId, toggles: b.toggles || {} },
    items: b.prices,
  }));
}

export function buildBackup(state: AppState, items: Items, now: number): Backup {
  return JSON.parse(JSON.stringify({
    app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: now,
    characters: state.characters, activeId: state.activeId, toggles: state.toggles || {}, prices: items,
  }));
}
