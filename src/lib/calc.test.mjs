import { test, expect } from "bun:test";
import { computeOrderTotals, itemsWastageGrams } from "./calc.ts";
test("multi-item wastage sums qty × wpp then rati→g", () => {
  // (40×0.6 + 10×1) = 34 rati → 34/128*16.6 = 4.41g
  expect(itemsWastageGrams([{name:"a",qty:40,wastage_per_piece:0.6},{name:"b",qty:10,wastage_per_piece:1}])).toBe(4.41);
});
test("wastage is an allowance: Due = Issued − (Returned + Wastage)", () => {
  const r = computeOrderTotals({ issued_weight: 100, returned_weight: 90, wastage: 0, wastage_per_piece: 0, returned_qty: 0, fire_loss: 0, water_loss: 0,
    issued_items: [{name:"a",qty:40,wastage_per_piece:0.6},{name:"b",qty:10,wastage_per_piece:1}] });
  expect(r.due_gold).toBe(5.59);
  expect(r.excess_gold).toBe(0);
});
