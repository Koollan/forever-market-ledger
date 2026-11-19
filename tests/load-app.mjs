// Loads the app script's non-UI code (src/legacy.ts) into a Node context so tests can call its functions.
// Runs the script up to the Rendering section, with minimal browser stubs.
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const APP = fileURLToPath(new URL("../src/legacy.ts", import.meta.url));

export function loadApp(names) {
  const js = fs.readFileSync(APP, "utf8");
  const cut = js.indexOf("/* ============ Rendering");
  const ctx = {
    window: {},
    localStorage: { getItem: () => null, setItem() {} },
    document: { querySelector: () => null },
    console,
  };
  vm.createContext(ctx);
  const exports = names.map((n) => `${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(",");
  vm.runInContext(js.slice(0, cut) + `;globalThis.__app={${exports}};`, ctx);
  // Objects built inside the vm have the sandbox's prototypes, which strict deepEqual rejects.
  // Return plain copies so tests compare values only.
  const plain = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  return Object.fromEntries(
    Object.entries(ctx.__app).map(([k, fn]) => [k, typeof fn === "function" ? (...a) => plain(fn(...a)) : fn]),
  );
}
