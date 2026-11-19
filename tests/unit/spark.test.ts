// The material sheet's 24-hour price line: an SVG path from hourly prices (high prices at the top)
import { describe, expect, it } from "vitest";
import { sparkPath } from "../../src/ui/spark";

describe("sparkPath", () => {
  it("scales prices to the box and breaks the line at a missing hour", () => {
    // x = 0, 25, 50, 75, 100; the low price 10 sits at the bottom (y 20), the high price 20 at the top (y 0)
    expect(sparkPath([10, 20, null, 20, 10], 100, 20, 0)).toBe("M0 20 L25 0 M75 0 L100 20");
  });

  it("draws a flat price as a flat line through the middle", () => {
    expect(sparkPath([5, 5, 5], 100, 20, 0)).toBe("M0 10 L50 10 L100 10");
  });

  it("keeps a lone hour between gaps visible as a dot, and leaves room for the stroke", () => {
    expect(sparkPath([null, 7, null], 100, 20, 0)).toBe("M50 10 l0 0");
    expect(sparkPath([10, 20], 100, 20, 2)).toBe("M0 18 L100 2");
  });

  it("is empty with no prices", () => {
    expect(sparkPath([null, null], 100, 20, 0)).toBe("");
    expect(sparkPath([], 100, 20, 0)).toBe("");
  });
});
