// The app's stored data (see planning/t1-t2/design/detailed-design.md, section 5)

export type Character = {
  id: string;
  name: string;
  cls: string;
  level: number; // 1–60
  faction: "Alliance" | "Horde";
  region?: string; // "us" | "eu"
  gold?: number | null; // copper; null = estimate by level
  stretch?: number; // zone reach +0..+5, default 2
  skyborne?: boolean;
  profs: { name: string; skill: number }[]; // skill 0–300
  example?: boolean; // the built-in example character
};

export type PriceEntry = { t: number; price: number }; // Unix ms, copper
export type PriceItem = { key: string; name: string; hist: PriceEntry[] };
export type Items = Record<string, PriceItem>;
export type AppState = { characters: Character[]; activeId: string; toggles: Record<string, unknown> };
