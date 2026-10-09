export const STOCK_GROUPS = [
  { group: "A", purity: "15 ပဲ" },
  { group: "B", purity: "14 ပဲ 2 ပြား" },
  { group: "C", purity: "14 ပဲ" },
] as const;
export type StockGroup = (typeof STOCK_GROUPS)[number]["group"];
export type StockMode = "add" | "set";

export function parseStockGrams(input: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(input.trim())) return null;
  const amount = Number(input);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function nextStockGrams(current: number, amount: number, mode: StockMode) {
  return mode === "add" ? current + amount : amount;
}