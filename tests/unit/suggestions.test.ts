import { test, expect } from "vitest";
import { bestFarm, sellAdvice, todaySuggestions, sessionPlan } from "../../src/engine/suggestions";
import { budgetOf } from "../../src/engine/farm";
import { plainMoney } from "../../src/engine/util";
import { CHARACTERS, TOP_ZONE, MOMENTS, PRICES } from "../fixtures/reference";
import type { Character } from "../../src/engine/types";

const weekday = Date.parse(MOMENTS[0].iso); // Wednesday 14:00 New York
const saturday = Date.parse(MOMENTS[1].iso); // Saturday 19:00 New York
const at = (now: number) => ({ now, items: PRICES, toggles: {} });

for (const c of CHARACTERS) {
  test(`${c.name}'s top farming zone on a weekday is ${TOP_ZONE[c.id]}`, () => {
    expect(bestFarm(c as Character, at(weekday))?.top.zone).toBe(TOP_ZONE[c.id]);
  });
}

for (const mins of [30, 60, 120]) {
  test(`a ${mins}-minute session plan uses exactly ${mins} minutes`, () => {
    for (const c of CHARACTERS) {
      const steps = sessionPlan(c as Character, mins, at(weekday));
      expect(steps.reduce((t, s) => t + s.m, 0), c.name).toBe(mins);
    }
  });
}

test("sell advice says list on a weekday and hold on the weekend for raw materials", () => {
  const rogue = CHARACTERS[0] as Character;
  const action = (now: number) => Object.fromEntries(sellAdvice(rogue, at(now)).map((x) => [x.name, x.action]));
  expect(action(weekday).Peacebloom).toBe("list");
  expect(action(saturday).Peacebloom).toBe("hold");
});

test("a buy suggestion names the character's budget", () => {
  // Level 42 hunter with no gold entered: the level-based estimate is 150g
  const hunter = CHARACTERS[2] as Character;
  const withAlchemy = { ...hunter, profs: [...hunter.profs, { name: "Alchemy", skill: 1 }] };
  const buy = todaySuggestions(withAlchemy, at(weekday)).find((s) => s.kind === "Buy");
  expect(buy).toBeDefined();
  expect(budgetOf(hunter)).toBe(1500000);
  expect(buy!.body).toContain(`within your ${plainMoney(1500000)} budget`);
});
