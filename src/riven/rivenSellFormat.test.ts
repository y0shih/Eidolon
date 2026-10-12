// Run with: node --experimental-strip-types --test src/riven/rivenSellFormat.test.ts

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatRivenSingle,
  formatRivenCopy,
  formatRivenItemFragment,
  formatRivenBatch,
  getFittingBatch,
  DEFAULT_DIRECT_TPL,
  DEFAULT_AUCTION_TPL,
  DEFAULT_ICON,
} from "./rivenSellFormat.ts";
import type { RivenSellQueueItem } from "../types/market.ts";

const createItem = (overrides: Partial<RivenSellQueueItem> = {}): RivenSellQueueItem => ({
  id: "test-1",
  weaponName: "Braton",
  modName: "Acri-critacan",
  price: 250,
  mode: "direct",
  ...overrides,
});

test("formatRivenSingle formats direct sale item with default template", () => {
  const item = createItem({ weaponName: "Braton", modName: "Acri-critacan", price: 250, mode: "direct" });
  const result = formatRivenSingle(item);
  assert.equal(result, "WTS :platinum: [Braton Acri-critacan] 250p :platinum:");
});

test("formatRivenSingle formats auction item with default template", () => {
  const item = createItem({ weaponName: "Latron", modName: "Visi-crit", price: 400, mode: "auction" });
  const result = formatRivenSingle(item);
  assert.equal(result, "WTS :platinum: [Latron Visi-crit] PMO >400p :platinum:");
});

test("formatRivenSingle replaces custom icon correctly", () => {
  const item = createItem({ weaponName: "Torid", modName: "Toxi-visican", price: 500 });
  const result = formatRivenSingle(item, DEFAULT_DIRECT_TPL, DEFAULT_AUCTION_TPL, "⚡");
  assert.equal(result, "WTS ⚡ [Torid Toxi-visican] 500p ⚡");
});

test("formatRivenCopy alias matches formatRivenSingle", () => {
  const item = createItem();
  assert.equal(formatRivenCopy(item), formatRivenSingle(item));
});

test("formatRivenItemFragment formats item and price without global prefixes", () => {
  const direct = createItem({ mode: "direct", price: 150 });
  const auction = createItem({ mode: "auction", price: 300 });

  assert.equal(formatRivenItemFragment(direct), "[Braton Acri-critacan] 150p");
  assert.equal(formatRivenItemFragment(auction), "[Braton Acri-critacan] PMO >300p");
});

test("formatRivenBatch in grouped mode aggregates items under single header and separator", () => {
  const items = [
    createItem({ id: "1", weaponName: "Braton", modName: "Acri-critacan", price: 250, mode: "direct" }),
    createItem({ id: "2", weaponName: "Latron", modName: "Visi-crit", price: 350, mode: "direct" }),
    createItem({ id: "3", weaponName: "Torid", modName: "Toxi-visican", price: 500, mode: "auction" }),
  ];

  const result = formatRivenBatch(items, {
    mode: "grouped",
    batchPrefix: "WTS {icon}",
    batchSuffix: "{icon}",
    batchSep: " | ",
    icon: ":platinum:",
  });

  assert.equal(
    result,
    "WTS :platinum: [Braton Acri-critacan] 250p | [Latron Visi-crit] 350p | [Torid Toxi-visican] PMO >500p :platinum:"
  );
  assert.ok(result.length < 180, `Length ${result.length} should be under 180`);
});

test("formatRivenBatch in separate mode joins individual templates with spaces", () => {
  const items = [
    createItem({ id: "1", weaponName: "Braton", modName: "Acri-critacan", price: 100, mode: "direct" }),
    createItem({ id: "2", weaponName: "Torid", modName: "Critatis", price: 200, mode: "direct" }),
  ];

  const result = formatRivenBatch(items, { mode: "separate", icon: "★" });
  assert.equal(
    result,
    "WTS ★ [Braton Acri-critacan] 100p ★ WTS ★ [Torid Critatis] 200p ★"
  );
});

test("formatRivenBatch with single item uses single template", () => {
  const items = [createItem({ weaponName: "Braton", modName: "Hexa-visican", price: 120 })];
  const result = formatRivenBatch(items, { mode: "grouped" });
  assert.equal(result, "WTS :platinum: [Braton Hexa-visican] 120p :platinum:");
});

test("formatRivenBatch handles empty array", () => {
  assert.equal(formatRivenBatch([]), "");
});

test("getFittingBatch returns all items when within chat limit", () => {
  const items = [
    createItem({ id: "1", weaponName: "Braton", modName: "ModA", price: 100 }),
    createItem({ id: "2", weaponName: "Latron", modName: "ModB", price: 200 }),
  ];

  const fit = getFittingBatch(items, { mode: "grouped" }, 180);
  assert.equal(fit.count, 2);
  assert.equal(fit.total, 2);
  assert.ok(fit.text.length <= 180);
});

test("getFittingBatch trims items from the tail until result fits maxChars", () => {
  // Create 6 items that collectively exceed 180 chars
  const items = [
    createItem({ id: "1", weaponName: "Kuva Bramma", modName: "Critatis-visican", price: 600 }),
    createItem({ id: "2", weaponName: "Kuva Zarr", modName: "Acri-lexican", price: 550 }),
    createItem({ id: "3", weaponName: "Tenet Arca Plasmor", modName: "Toxi-critacan", price: 700 }),
    createItem({ id: "4", weaponName: "Tenet Cycron", modName: "Magna-visican", price: 450 }),
    createItem({ id: "5", weaponName: "Felarx", modName: "Sati-visican", price: 800 }),
  ];

  const full = formatRivenBatch(items, { mode: "grouped" });
  assert.ok(full.length > 180, `Full text length ${full.length} should exceed 180`);

  const fit = getFittingBatch(items, { mode: "grouped" }, 180);
  assert.ok(fit.count < items.length, `Count ${fit.count} should be less than ${items.length}`);
  assert.ok(fit.text.length <= 180, `Fit text length ${fit.text.length} must be <= 180`);
  assert.equal(fit.total, 5);
});
