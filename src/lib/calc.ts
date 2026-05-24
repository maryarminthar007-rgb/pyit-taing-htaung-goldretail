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
  return_date: string | null;
  returned_qty: number | null;
  returned_item_name: string | null;
  returned_weight: number | null;
  wastage: number | null;
  wastage_per_piece: number | null;
  fire_loss: number | null;
  water_loss: number | null;
  due_gold: number | null;
  excess_gold: number | null;
  total_due_gold: number | null;
  total_excess_gold: number | null;
  sort_index: number;
  created_at: string;
};

export function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}

/** Total wastage = wastage_per_piece * returned_qty (falls back to stored wastage). */
export function computeTotalWastage(o: Pick<OrderRow, "wastage_per_piece" | "returned_qty" | "wastage">) {
  const wpp = Number(o.wastage_per_piece ?? 0);
  const qty = Number(o.returned_qty ?? 0);
  if (wpp > 0 && qty > 0) return round4(wpp * qty);
  return Number(o.wastage ?? 0);
}

export function computeOrderTotals(
  input: Pick<OrderRow, "issued_weight" | "returned_weight" | "wastage" | "wastage_per_piece" | "returned_qty" | "fire_loss" | "water_loss">,
) {
  const issued = Number(input.issued_weight ?? 0);
  const totalWaste = computeTotalWastage(input);
  const accounted =
    Number(input.returned_weight ?? 0) +
    totalWaste +
    Number(input.fire_loss ?? 0) +
    Number(input.water_loss ?? 0);
  const diff = issued - accounted;
  const due_gold = diff > 0 ? round4(diff) : 0;
  const excess_gold = diff < 0 ? round4(-diff) : 0;
  return { due_gold, excess_gold, total_wastage: totalWaste };
}

export function recomputeBookTotals(orders: OrderRow[]) {
  const sorted = [...orders].sort((a, b) => a.sort_index - b.sort_index);
  let runDue = 0;
  let runExcess = 0;
  return sorted.map((o) => {
    const { due_gold, excess_gold } = computeOrderTotals(o);
    const net = due_gold - excess_gold;
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
