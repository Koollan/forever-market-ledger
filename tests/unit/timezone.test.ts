import { test, expect } from "vitest";

test("tests run in New York time, so local-time rules give the same result on every machine", () => {
  // Nov 18 2026 19:00 UTC is 14:00 in New York (EST, UTC-5)
  expect(new Date(Date.UTC(2026, 10, 18, 19)).getHours()).toBe(14);
});
