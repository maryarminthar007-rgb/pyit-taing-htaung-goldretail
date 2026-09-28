import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { kpyParts } from "@/lib/risk";

/**
 * Typography primitives for the deposit / ledger figures.
 * Rule: clean sans-serif throughout, numbers slightly larger than their unit
 * labels (ကျပ် / ပဲ / ရွေး / MMK / g) so both sit on one baseline with a
 * comfortable, even size — no decorative faces, no extreme contrast.
 */
export type FigureSize = "hero" | "card" | "row" | "micro";

const NUM: Record<FigureSize, string> = {
  hero: "text-[26px] font-semibold leading-tight",
  card: "text-[22px] font-semibold leading-tight",
  row: "text-[17px] font-semibold leading-tight",
  micro: "text-[13px] font-medium leading-tight",
};

const UNIT: Record<FigureSize, string> = {
  hero: "text-[15px] font-medium leading-none text-muted-foreground",
  card: "text-[14px] font-medium leading-none text-muted-foreground",
  row: "text-[12px] font-medium leading-none text-muted-foreground",
  micro: "text-[11px] font-medium leading-none text-muted-foreground",
};

function Pair({ value, unit, size }: { value: ReactNode; unit: string; size: FigureSize }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className={NUM[size]}>{value}</span>
      <span className={cn("whitespace-nowrap", UNIT[size])}>{unit}</span>
    </span>
  );
}

/** grams → "K ကျပ် P ပဲ Y ရွေး" figure in clean sans-serif. */
export function KPY({ g, size = "card", className }: { g: number; size?: FigureSize; className?: string }) {
  const { k, p, y } = kpyParts(g);
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-3 gap-y-0.5 whitespace-nowrap font-sans tabular-nums", className)}>
      <Pair value={k.toLocaleString()} unit="ကျပ်" size={size} />
      <Pair value={p} unit="ပဲ" size={size} />
      <Pair value={y} unit="ရွေး" size={size} />
    </span>
  );
}

/** Cash amount → number with a small MMK suffix, one baseline. */
export function Cash({ value, size = "card", currency = "MMK", className }: { value: number; size?: FigureSize; currency?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 whitespace-nowrap font-sans tabular-nums", className)}>
      <span className={NUM[size]}>{Number(value || 0).toLocaleString()}</span>
      <span className={cn("whitespace-nowrap", UNIT[size])}>{currency}</span>
    </span>
  );
}

/** Grams → number with a small "g" suffix, one baseline. */
export function Grams({ value, size = "row", className }: { value: number; size?: FigureSize; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 whitespace-nowrap font-sans tabular-nums", className)}>
      <span className={NUM[size]}>{Number(value || 0).toFixed(2)}</span>
      <span className={cn("whitespace-nowrap", UNIT[size])}>g</span>
    </span>
  );
}
