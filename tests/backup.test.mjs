import { test } from "node:test";
import assert from "node:assert/strict";
import { loadApp } from "./load-app.mjs";

const { validateBackup, buildBackup, backupData, staleKeys } =
  loadApp(["validateBackup", "buildBackup", "backupData", "staleKeys"]);

// A known-good app state: two characters (one with Skyborne), two priced materials
const rogue = { id: "r1", name: "Vexa", cls: "Rogue", level: 15, faction: "Alliance", region: "us", gold: null,
  stretch: 2, skyborne: false, profs: [{ name: "Herbalism", skill: 90 }, { name: "Skinning", skill: 80 }] };
const hunter = { id: "h1", name: "Tusk", cls: "Hunter", level: 42, faction: "Horde", region: "us", gold: 1500000,
  stretch: 3, skyborne: true, profs: [{ name: "Skinning", skill: 205 }] };
const state = () => ({ characters: [rogue, hunter], activeId: "h1", toggles: {} });
const items = () => ({
  "item~peacebloom": { key: "item~peacebloom", name: "Peacebloom", hist: [{ t: 1794950000000, price: 82 }, { t: 1795000000000, price: 79 }] },
  "item~medium-leather": { key: "item~medium-leather", name: "Medium Leather", hist: [{ t: 1794990000000, price: 410 }] },
});
const NOW = 1795046400000;
const roundTrip = (b) => validateBackup(JSON.stringify(b));
// A valid backup to break one field at a time
const valid = () => JSON.parse(JSON.stringify(buildBackup(state(), items(), NOW)));

test("a backup reads back as the same characters, active character and prices, with counts", () => {
  const r = roundTrip(buildBackup(state(), items(), NOW));
  assert.equal(r.ok, true);
  assert.deepEqual(r.backup.characters, [rogue, hunter]);
  assert.equal(r.backup.activeId, "h1");
  assert.deepEqual(r.backup.toggles, {});
  assert.deepEqual(r.backup.prices, items());
  assert.deepEqual(r.counts, { characters: 2, prices: 2 });
});

test("JSON from something else is refused as not a Forever Market Ledger backup", () => {
  for (const b of [{ ...valid(), app: "other-app" }, [1, 2], null, { characters: [] }]) {
    const r = roundTrip(b);
    assert.equal(r.ok, false);
    assert.equal(r.error, "This isn't a Forever Market Ledger backup.");
  }
});

test("a backup from a newer version of the app is refused", () => {
  const r = roundTrip({ ...valid(), version: 2 });
  assert.equal(r.ok, false);
  assert.equal(r.error, "This backup is from a newer version of the app. Update the app and try again.");
});

test("a backup without a usable version number is refused as not a backup", () => {
  for (const version of [undefined, "1", 0, 1.5]) {
    const r = roundTrip({ ...valid(), version });
    assert.equal(r.ok, false, `version ${version}`);
    assert.equal(r.error, "This isn't a Forever Market Ledger backup.");
  }
});

test("a backup with no characters is refused", () => {
  for (const characters of [[], undefined, "Vexa"]) {
    const r = roundTrip({ ...valid(), characters });
    assert.equal(r.ok, false);
    assert.equal(r.error, "This backup has no characters.");
  }
});

test("a damaged character is refused, naming which character and what is wrong", () => {
  const cases = [
    [{ name: "" }, "Character 2 has no name."],
    [{ id: 7 }, "Character 2 has no id."],
    [{ cls: "Monk" }, "Character 2 has an unknown class."],
    [{ level: 0 }, "Character 2 has an invalid level."],
    [{ level: 61 }, "Character 2 has an invalid level."],
    [{ level: "42" }, "Character 2 has an invalid level."],
    [{ faction: "Neutral" }, "Character 2 has no faction."],
    [{ profs: "Skinning" }, "Character 2 has invalid professions."],
    [{ profs: [{ name: "Skinning", skill: 301 }] }, "Character 2 has invalid professions."],
  ];
  for (const [change, error] of cases) {
    const b = valid();
    Object.assign(b.characters[1], change);
    const r = roundTrip(b);
    assert.equal(r.ok, false, JSON.stringify(change));
    assert.equal(r.error, error);
  }
});

test("a backup whose active character isn't in it is refused", () => {
  const r = roundTrip({ ...valid(), activeId: "gone" });
  assert.equal(r.ok, false);
  assert.equal(r.error, "The active character isn't in this backup.");
});

test("a damaged price list is refused, naming the material when it can", () => {
  const cases = [
    [(b) => { b.prices = [1]; }, "The price list in this backup is damaged."],
    [(b) => { b.prices = undefined; }, "The price list in this backup is damaged."],
    [(b) => { b.prices["item~peacebloom"].hist = "82"; }, "The prices for Peacebloom are damaged."],
    [(b) => { b.prices["item~peacebloom"].hist[1].price = -5; }, "The prices for Peacebloom are damaged."],
    [(b) => { b.prices["item~peacebloom"].hist[0].t = "yesterday"; }, "The prices for Peacebloom are damaged."],
    [(b) => { delete b.prices["item~medium-leather"].name; }, "The prices for item~medium-leather are damaged."],
  ];
  for (const [change, error] of cases) {
    const b = valid();
    change(b);
    const r = roundTrip(b);
    assert.equal(r.ok, false, error);
    assert.equal(r.error, error);
  }
});

test("a backup with no prices at all is accepted", () => {
  const r = roundTrip({ ...valid(), prices: {} });
  assert.equal(r.ok, true);
  assert.deepEqual(r.counts, { characters: 2, prices: 0 });
});

test("unknown extra fields are ignored and not kept", () => {
  const b = valid();
  b.theme = "dark";
  b.characters[0].mood = "grumpy";
  b.prices["item~peacebloom"].note = "cheap on Sundays";
  b.prices["item~peacebloom"].hist[0].seller = "Bob";
  const r = roundTrip(b);
  assert.equal(r.ok, true);
  assert.deepEqual(r.backup, valid());
});

test("the built-in example character's marker survives a round trip", () => {
  const example = { ...rogue, id: "ex", example: true };
  const r = roundTrip(buildBackup({ characters: [example], activeId: "ex", toggles: {} }, {}, NOW));
  assert.equal(r.ok, true);
  assert.equal(r.backup.characters[0].example, true);
});

test("a backup is stamped with the app name, format version 1 and the export time", () => {
  const b = buildBackup(state(), items(), NOW);
  assert.equal(b.app, "forever-market-ledger");
  assert.equal(b.version, 1);
  assert.equal(b.exportedAt, 1795046400000);
});

test("a paste that isn't JSON is refused with the incomplete-backup message", () => {
  const r = validateBackup("not a backup {");
  assert.equal(r.ok, false);
  assert.equal(r.error, "That isn't a complete backup. Copy the whole text from Export and try again.");
});

test("importing a backup gives exactly its characters, active character, switches and prices", () => {
  const { backup } = roundTrip(buildBackup(state(), items(), NOW));
  const d = backupData(backup);
  assert.deepEqual(d.state, { characters: [rogue, hunter], activeId: "h1", toggles: {} });
  assert.deepEqual(d.items, items());
});

test("after an import, saved prices the backup doesn't have are the ones to delete", () => {
  const old = { "item~peacebloom": {}, "item~iron-ore": {}, "item~runecloth": {} };
  const incoming = { "item~peacebloom": {}, "item~medium-leather": {} };
  assert.deepEqual(staleKeys(old, incoming), ["item~iron-ore", "item~runecloth"]);
  assert.deepEqual(staleKeys({}, incoming), []);
});
