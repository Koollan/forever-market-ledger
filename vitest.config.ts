import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.{ts,mjs}"],
    // The conditions engine uses the device's local day and hour, so tests pin one zone (US realms)
    env: { TZ: "America/New_York" },
  },
});
