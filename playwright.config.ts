import { defineConfig, devices } from "@playwright/test";

// Phone-first: every check runs at 412×900 in New York time (US realms; the rules use local time)
export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 412, height: 900 },
    timezoneId: "America/New_York",
  },
  webServer: {
    command: "npm run serve:legacy -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
