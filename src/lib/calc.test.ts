import { describe, expect, test } from "bun:test";
import { computeOrderTotals, recomputeBookTotals, type OrderRow } from "./calc";

const order = (id: string, issued: number, returned: number): OrderRow => ({
  id,
  book_id: "book",
  issue_date: "2026-09-30",
  ordered_qty: 1,
  issued_item_name: "Test item",
  gold_quality: "15",
  specs: null,
  issued_weight: issued,
  return_due_date: null,
  return_date: "2026-09-30",
  returned_qty: 1,
  returned_item_name: "Test item",
  returned_weight: returned,
  wastage: 0,
  wastage_per_piece: 0,
  fire_loss: 0,
  water_loss: 0,
  due_gold: 0,
  excess_gold: 0,
  total_due_gold: 0,
  total_excess_gold: 0,
  sort_index: Number(id),
  created_at: "2026-09-30T00:00:00Z",
});

describe("order balance calculations", () => {
  test("Scrap Gold is informational and does not change Due or Excess", () => {
    const withoutScrap = computeOrderTotals({ ...order("1", 100, 90), scrap_gold: 0 });
    const withScrap = computeOrderTotals({ ...order("1", 100, 90), scrap_gold: 25 });

    expect(withScrap).toEqual(withoutScrap);
    expect(withScrap.due_gold).toBe(10);
  });

  test("later Excess subtracts from earlier Due", () => {
    const rows = recomputeBookTotals([order("1", 100, 90), order("2", 90, 96)]);

    expect(rows[1]?.total_due_gold).toBe(4);
    expect(rows[1]?.total_excess_gold).toBe(0);
  });

  test("later Due subtracts from earlier Excess", () => {
    const rows = recomputeBookTotals([order("1", 90, 100), order("2", 96, 90)]);

    expect(rows[1]?.total_due_gold).toBe(0);
    expect(rows[1]?.total_excess_gold).toBe(4);
  });
});