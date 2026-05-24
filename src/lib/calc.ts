export type OrderRow = {
  id: string;
  book_id: string;
  issue_date: string | null;
  ordered_qty: number | null;
  issued_item_name: string | null;
  gold_quality: string | null;
  specs: string | null;
  issued_weight: number | null;
  return_due_date: string | null;
  returned_qty: number | null;
  returned_item_name: string | null;
  returned_weight: number | null;
  wastage: number | null;
  fire_loss: number | null;
  due_gold: number | null;
  excess_gold: number | null;
  total_due_gold: number | null;
  total_excess_gold: number | null;
  sort_index: number;
  created_at: string;
};

export type OrderInput = Omit<
  OrderRow,
  "id" | "created_at" | "due_gold" | "excess_gold" | "total_due_gold" | "total_excess_gold"
>;

export function computeOrderTotals(
  input: Pick<OrderRow, "issued_weight" | "returned_weight" | "wastage" | "fire_loss">,
) {
  const issued = Number(input.issued_weight ?? 0);
  const accounted =
    Number(input.returned_weight ?? 0) +
    Number(input.wastage ?? 0) +
    Number(input.fire_loss ?? 0);
  const diff = issued - accounted; // positive => due, negative => excess
  const due_gold = diff > 0 ? round4(diff) : 0;
  const excess_gold = diff < 0 ? round4(-diff) : 0;
  return { due_gold, excess_gold };
}

export function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/** Recompute accumulated totals for all orders in a book, in chronological order. */
export function recomputeBookTotals(orders: OrderRow[]) {
  const sorted = [...orders].sort((a, b) => a.sort_index - b.sort_index);
  let runDue = 0;
  let runExcess = 0;
  return sorted.map((o) => {
    const { due_gold, excess_gold } = computeOrderTotals(o);
    // Net effect: any new due adds to running due; any excess pays down due first, then adds to excess.
    let net = due_gold - excess_gold;
    let netDue = runDue + net;
    let netExcess = runExcess;
    if (netDue < 0) {
      netExcess += -netDue;
      netDue = 0;
    }
    runDue = netDue;
    runExcess = netExcess;
    return {
      ...o,
      due_gold,
      excess_gold,
      total_due_gold: round4(runDue),
      total_excess_gold: round4(runExcess),
    };
  });
}
