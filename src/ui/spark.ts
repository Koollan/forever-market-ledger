// The material sheet's price line (T3): hourly prices → an SVG path, oldest on the left, high prices at the top.
// Missing hours break the line instead of dropping it to zero.
const r = (n: number) => Math.round(n * 10) / 10;

export function sparkPath(values: (number | null)[], width: number, height: number, pad = 2): string {
  const known = values.filter((v): v is number => v != null);
  if (!known.length) return "";
  const lo = Math.min(...known), hi = Math.max(...known), n = values.length;
  const x = (k: number) => r(n > 1 ? (k * width) / (n - 1) : width / 2);
  const y = (v: number) => r(hi === lo ? height / 2 : pad + ((hi - v) / (hi - lo)) * (height - 2 * pad));
  const parts: string[] = [];
  let drawing = false;
  values.forEach((v, k) => {
    if (v == null) { drawing = false; return; }
    const lone = !drawing && values[k + 1] == null; // no neighbour to draw to: show a dot
    parts.push(`${drawing ? "L" : "M"}${x(k)} ${y(v)}${lone ? " l0 0" : ""}`);
    drawing = true;
  });
  return parts.join(" ");
}
