// Fixed inputs for the behavior lock: three reference characters (from CLAUDE.md), three fixed
// moments in New York time, and a small set of entered prices so estimates and sell advice run.

export type RefCharacter = {
  id: string; name: string; cls: string; level: number; faction: "Alliance" | "Horde"; region: "us";
  gold: null; stretch: number; skyborne: boolean; profs: { name: string; skill: number }[];
};

export const CHARACTERS: RefCharacter[] = [
  { id: "ref-rogue-15", name: "Ref Rogue", cls: "Rogue", level: 15, faction: "Alliance", region: "us", gold: null,
    stretch: 2, skyborne: false, profs: [{ name: "Herbalism", skill: 90 }, { name: "Skinning", skill: 80 }] },
  { id: "ref-hunter-24", name: "Ref Hunter 24", cls: "Hunter", level: 24, faction: "Horde", region: "us", gold: null,
    stretch: 2, skyborne: false, profs: [{ name: "Skinning", skill: 120 }] },
  { id: "ref-hunter-42", name: "Ref Hunter 42", cls: "Hunter", level: 42, faction: "Horde", region: "us", gold: null,
    stretch: 2, skyborne: false, profs: [{ name: "Skinning", skill: 205 }] },
];

// Expected top farming zone at the weekday moment (CLAUDE.md)
export const TOP_ZONE: Record<string, string> = {
  "ref-rogue-15": "Darkshore",
  "ref-hunter-24": "The Barrens",
  "ref-hunter-42": "Feralas",
};

export const MOMENTS = [
  { id: "wed-1400", label: "Wednesday afternoon (midweek)", iso: "2026-11-18T19:00:00Z" }, // 14:00 New York
  { id: "sat-1900", label: "Saturday evening (weekend, prime time)", iso: "2026-11-22T00:00:00Z" }, // Sat 19:00 New York
  { id: "mon-1800", label: "Monday evening (raid reset prep)", iso: "2026-11-23T23:00:00Z" }, // 18:00 New York
] as const;

const at = (iso: string) => Date.parse(iso);
const item = (name: string, hist: [string, number][]) => {
  const key = "item~" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [key, { key, name, hist: hist.map(([t, price]) => ({ t: at(t), price })) }] as const;
};

// Copper prices entered on earlier days (one weekday and one weekend entry each where possible)
export const PRICES = Object.fromEntries([
  item("Peacebloom", [["2026-11-14T20:00:00Z", 90], ["2026-11-17T18:00:00Z", 80]]),
  item("Briarthorn", [["2026-11-15T21:00:00Z", 310], ["2026-11-17T19:00:00Z", 335]]),
  item("Medium Leather", [["2026-11-14T22:00:00Z", 420], ["2026-11-16T17:00:00Z", 455]]),
  item("Heavy Leather", [["2026-11-17T23:00:00Z", 1180]]),
  item("Thick Leather", [["2026-11-15T19:00:00Z", 2300], ["2026-11-17T20:00:00Z", 2450]]),
]);

export function seedFor(c: RefCharacter) {
  return { state: { characters: [c], activeId: c.id, toggles: {} }, items: PRICES };
}
