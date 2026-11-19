// Snapshot times: each house response's Last-Modified is Blizzard's snapshot time (T3 probe, Nov 19, 2026).
// A point is keyed by the newest snapshot's hour, so a late or repeated run never invents an hour.

export type Snapshots = Record<number, string>; // house ID → ISO snapshot time

export function pointHour(snapshots: Snapshots): string | null {
  const times = Object.values(snapshots).map((t) => Date.parse(t)).filter((t) => !Number.isNaN(t));
  if (!times.length) return null;
  return new Date(Math.max(...times)).toISOString().slice(0, 13) + ":00:00Z";
}

// New data = some house read this run has a snapshot the last stored point didn't. A house that
// failed this run is simply absent, which is not a change.
export function changed(prev: Snapshots | null, next: Snapshots): boolean {
  return Object.entries(next).some(([house, t]) => !prev || prev[Number(house)] !== t);
}
