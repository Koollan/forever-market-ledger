// Snapshot times: each house response's Last-Modified is Blizzard's snapshot time (T3 probe, Nov 19, 2026).
// A point is keyed by the newest snapshot's hour, so a late or repeated run never invents an hour.

export type Snapshots = Record<number, string>; // house ID → ISO snapshot time

// A house's snapshot time from its Last-Modified header. A missing or malformed header falls back to
// the run's hour (marked), so the pipeline keeps recording if Blizzard drops the header.
export function snapshotOf(lastModified: string | null, now: number): { iso: string; fallback: boolean } {
  const t = lastModified ? Date.parse(lastModified) : NaN;
  if (!Number.isNaN(t)) return { iso: new Date(t).toISOString(), fallback: false };
  return { iso: new Date(Math.floor(now / 36e5) * 36e5).toISOString(), fallback: true };
}

export function pointHour(snapshots: Snapshots): string | null {
  const times = Object.values(snapshots).map((t) => Date.parse(t)).filter((t) => !Number.isNaN(t));
  if (!times.length) return null;
  return new Date(Math.max(...times)).toISOString().slice(0, 13) + ":00:00Z";
}

// New data = some house read this run has a snapshot newer than the stored one (or none stored).
// A failed house is simply absent, and an older snapshot (a stale cache) is not new.
export function changed(prev: Snapshots | null, next: Snapshots): boolean {
  return Object.entries(next).some(([house, t]) => {
    const stored = prev?.[Number(house)];
    return !stored || Date.parse(t) > Date.parse(stored);
  });
}

// Each house's newest snapshot across the stored and the new ones
export function newest(prev: Snapshots | null, next: Snapshots): Snapshots {
  const out: Snapshots = { ...(prev ?? {}) };
  for (const [house, t] of Object.entries(next)) {
    const h = Number(house);
    if (!out[h] || Date.parse(t) > Date.parse(out[h])) out[h] = t;
  }
  return out;
}
