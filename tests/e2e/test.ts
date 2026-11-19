// Every browser test uses this `test`: the app's price fetch (raw.githubusercontent.com) gets a 404 unless
// a test serves files itself, so no test touches the network and the behavior lock sees no API prices.
import { test as base, expect } from "@playwright/test";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const PRICES = "https://raw.githubusercontent.com/Koollan/forever-market-ledger/prices/";

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("https://raw.githubusercontent.com/**", (r) => r.fulfill({ status: 404, body: "" }));
    await use(page);
  },
});

const FIXTURES = fileURLToPath(new URL("../fixtures/prices/", import.meta.url));

// Serve tests/fixtures/prices/<path> for <PRICES><path>; anything missing is a 404
export async function servePrices(page: import("@playwright/test").Page) {
  await page.route(`${PRICES}**`, (r) => {
    const file = FIXTURES + r.request().url().slice(PRICES.length);
    return fs.existsSync(file) ? r.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync(file, "utf8") }) : r.fulfill({ status: 404, body: "" });
  });
}

export { expect };
