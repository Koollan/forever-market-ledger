import { test, expect } from "./test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTERS, MOMENTS, TOP_ZONE } from "../fixtures/reference";
import { capture } from "./capture";

// The behavior lock. RECORD_BASELINE=1 writes tests/baseline/*.json from whatever app is served
// (done once, against the single-file app after T1). Otherwise every run must match those files exactly.
const RECORD = process.env.RECORD_BASELINE === "1";
const DIR = fileURLToPath(new URL("../baseline/", import.meta.url));

for (const c of CHARACTERS) {
  for (const m of MOMENTS) {
    test(`${c.name} on ${m.label} matches the baseline`, async ({ page }) => {
      const got = await capture(page, c, m.iso);
      const file = path.join(DIR, `${c.id}--${m.id}.json`);
      if (RECORD) {
        fs.mkdirSync(DIR, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(got, null, 1) + "\n");
        return;
      }
      const want = JSON.parse(fs.readFileSync(file, "utf8"));
      // Text first: a wording or layout change shows as a readable diff of the tab
      for (const tab of Object.keys(want.text)) expect.soft(got.text[tab], `${tab} tab text`).toBe(want.text[tab]);
      expect(got.engine).toEqual(want.engine);
    });
  }
}

for (const c of CHARACTERS) {
  test(`${c.name}'s top farming zone on a weekday is ${TOP_ZONE[c.id]}`, async ({ page }) => {
    const got = await capture(page, c, MOMENTS[0].iso);
    expect(got.engine.bestFarm?.top).toBe(TOP_ZONE[c.id]);
  });
}
