import { AlertTriangle } from "lucide-react";
import { computeOrderTotals, type OrderRow } from "@/lib/calc";
import type { QualityGroup } from "@/lib/categories";

export const GRAMS_PER_KYAT = 16.6;

export const GROUP_LABELS: Record<QualityGroup, string> = {
  A: "Group A (15 ပဲရည်)",
  B: "Group B (14 ပဲ 2 ပြားရည်)",
  C: "Group C (14 ပဲရည်)",
};

export type DepositInfo = {
  deposit_type?: string | null;
  deposit_gold_g?: number | null;
  deposit_cash?: number | null;
  deposit_gold_rate?: number | null;
};

/** grams → "K ကျပ် P ပဲ Y ရွေး" (1 kyat = 16 pe, 1 pe = 8 yway) */
export function gramsToKPY(g: number) {
  const totalYway = Math.round((g / GRAMS_PER_KYAT) * 128 * 100) / 100;
  const k = Math.floor(totalYway / 128);
  const p = Math.floor((totalYway - k * 128) / 8);
  const y = Math.round((totalYway - k * 128 - p * 8) * 100) / 100;
  return `${k} ကျပ် ${p} ပဲ ${y} ရွေး`;
}

/** Same breakdown as gramsToKPY but as parts, for styled figures. */
export function kpyParts(g: number) {
  const totalYway = Math.round((Number(g || 0) / GRAMS_PER_KYAT) * 128 * 100) / 100;
  const k = Math.floor(totalYway / 128);
  const p = Math.floor((totalYway - k * 128) / 8);
  const y = Math.round((totalYway - k * 128 - p * 8) * 100) / 100;
  return { k, p, y };
}

export function kpyToGrams(k: number, p: number, y: number) {
  return ((k * 128 + p * 8 + y) / 128) * GRAMS_PER_KYAT;
}

/** Deposit limit in grams of gold, or null if no deposit recorded. */
export function depositLimitGrams(g: DepositInfo): number | null {
  if (g.deposit_type === "gold") return Number(g.deposit_gold_g ?? 0);
  if (g.deposit_type === "cash") {
    const rate = Number(g.deposit_gold_rate ?? 0);
    if (rate <= 0) return 0;
    return (Number(g.deposit_cash ?? 0) / rate) * GRAMS_PER_KYAT;
  }
  return null;
}

export function depositLabel(g: DepositInfo) {
  if (g.deposit_type === "gold") return gramsToKPY(Number(g.deposit_gold_g ?? 0));
  if (g.deposit_type === "cash")
    return `${Number(g.deposit_cash ?? 0).toLocaleString()} ကျပ် (ငွေ)`;
  return "No deposit · စပေါ်မရှိ";
}

/** Outstanding gold = Σ(issued − accounted) across all orders, floored at 0. */
export function outstandingGrams(orders: OrderRow[]) {
  let net = 0;
  for (const o of orders) {
    const { due_gold, excess_gold } = computeOrderTotals(o);
    net += due_gold - excess_gold;
  }
  return Math.max(0, Math.round(net * 100) / 100);
}

export function isOverLimit(g: DepositInfo, orders: OrderRow[]) {
  const limit = depositLimitGrams(g);
  if (limit === null) return false;
  return outstandingGrams(orders) > limit;
}

export function OverLimitAlert({ outstanding, limit, compact }: { outstanding: number; limit: number; compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
        <AlertTriangle className="h-3 w-3" /> စပေါ်ထက် ပိုလွန်နေသည်
      </span>
    );
  }
  return (
    <div className="flex items-start gap-3 rounded-xl border-2 border-destructive bg-destructive/10 p-3 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold text-destructive">စပေါ်ထက် ပိုလွန်နေသည် · Over deposit limit</p>
        <p className="text-xs text-muted-foreground">
          Outstanding {outstanding.toFixed(2)}g ({gramsToKPY(outstanding)}) exceeds deposit {limit.toFixed(2)}g ({gramsToKPY(limit)}).
        </p>
      </div>
    </div>
  );
}

export type GroupSummary = Record<QualityGroup, { due: number; excess: number }>;

export function orderGroup(o: OrderRow & { quality_group?: string | null }, fallback: QualityGroup = "A"): QualityGroup {
  const q = (o.quality_group ?? "").toUpperCase();
  if (q === "A" || q === "B" || q === "C") return q;
  return fallback;
}

/** Monthly + total net balance split by quality group. Keys: "YYYY-MM". */
export function summarizeByGroup(
  orders: (OrderRow & { quality_group?: string | null })[],
  fallbackFor?: (o: OrderRow) => QualityGroup,
) {
  const empty = (): GroupSummary => ({ A: { due: 0, excess: 0 }, B: { due: 0, excess: 0 }, C: { due: 0, excess: 0 } });
  const months = new Map<string, GroupSummary>();
  const total = empty();
  for (const o of orders) {
    const g = orderGroup(o, fallbackFor ? fallbackFor(o) : "A");
    const { due_gold, excess_gold } = computeOrderTotals(o);
    const m = (o.issue_date ?? o.created_at).slice(0, 7);
    if (!months.has(m)) months.set(m, empty());
    const s = months.get(m)!;
    s[g].due += due_gold; s[g].excess += excess_gold;
    total[g].due += due_gold; total[g].excess += excess_gold;
  }
  const monthList = Array.from(months.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  return { total, months: monthList };
}

function net(s: { due: number; excess: number }) {
  const n = s.due - s.excess;
  return n >= 0
    ? { label: "လိုရွှေ", value: n, cls: "text-[color:var(--due)]" }
    : { label: "ပိုရွှေ", value: -n, cls: "text-[color:var(--excess)]" };
}

export function GroupSummaryTable({ total, months }: ReturnType<typeof summarizeByGroup>) {
  const groups: QualityGroup[] = ["A", "B", "C"];
  const Cell = ({ s }: { s: { due: number; excess: number } }) => {
    const n = net(s);
    return (
      <td className="border-l px-3 py-2 text-right tabular-nums">
        <span className={n.cls}>{n.value.toFixed(2)}g</span>
        <span className="ml-1 text-[10px] text-muted-foreground">{n.label}</span>
      </td>
    );
  };
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Month · လ</th>
            {groups.map((g) => <th key={g} className="border-l px-3 py-2 text-right">{GROUP_LABELS[g]}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t bg-gold-soft/40 font-semibold">
            <td className="px-3 py-2">Total · စုစုပေါင်း</td>
            {groups.map((g) => <Cell key={g} s={total[g]} />)}
          </tr>
          {months.map(([m, s]) => (
            <tr key={m} className="border-t">
              <td className="px-3 py-2 font-mono text-xs">{m}</td>
              {groups.map((g) => <Cell key={g} s={s[g]} />)}
            </tr>
          ))}
          {months.length === 0 && (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">No entries yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
