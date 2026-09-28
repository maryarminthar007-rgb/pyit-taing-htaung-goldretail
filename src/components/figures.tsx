import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { kpyParts } from "@/lib/risk";

/**
 * Typography primitives for the deposit / ledger figures.
 * Rule: the NUMBER is the visual focus (large, bold, tabular);
 * unit labels (ကျပ် / ပဲ / ရွေး / MMK / g) are small muted suffixes.
 */
export type FigureSize = "hero" | "card" | "row" | "micro";

const NUM: Record<FigureSize, string> = {
  hero: "font-display text-5xl font-bold leading-[1.05] tracking-tight",
  card: "font-display text-4xl font-bold leading-[1.1] tracking-tight",
  row: "font-display text-2xl font-bold leading-[1.15]",
  micro: "text-xs font-semibold leading-none",
};

const UNIT: Record<FigureSize, string> = {
  hero: "text-[11px] font-medium leading-none text-muted-foreground/80",
  card: "text-[10px] font-medium leading-none text-muted-foreground/80",
  row: "text-[9px] font-medium leading-none text-muted-foreground/80",
  micro: "text-[8px] font-medium leading-none text-muted-foreground/70",
};

function Pair({ value, unit, size }: { value: ReactNode; unit: string; size: FigureSize }) {
  return (
    <span className="inline-flex items-baseline gap-0.5">
      <span className={NUM[size]}>{value}</span>
      <span className={cn("whitespace-nowrap", UNIT[size])}>{unit}</span>
    </span>
  );
}

/** grams → big "K ကျပ် P ပဲ Y ရွေး" figure with subtle unit suffixes. */
export function KPY({ g, size = "card", className }: { g: number; size?: FigureSize; className?: string }) {
  const { k, p, y } = kpyParts(g);
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 whitespace-nowrap tabular-nums", className)}>
      <Pair value={k.toLocaleString()} unit="ကျပ်" size={size} />
      <Pair value={p} unit="ပဲ" size={size} />
      <Pair value={y} unit="ရွေး" size={size} />
    </span>
  );
}

/** Cash amount → big bold number with a small MMK suffix. */
export function Cash({ value, size = "card", currency = "MMK", className }: { value: number; size?: FigureSize; currency?: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1 whitespace-nowrap tabular-nums", className)}>
      <span className={NUM[size]}>{Number(value || 0).toLocaleString()}</span>
      <span className={cn("whitespace-nowrap", UNIT[size])}>{currency}</span>
    </span>
  );
}

/** Grams → big bold number with a small "g" suffix. */
export function Grams({ value, size = "row", className }: { value: number; size?: FigureSize; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-0.5 whitespace-nowrap tabular-nums", className)}>
      <span className={NUM[size]}>{Number(value || 0).toFixed(2)}</span>
      <span className={cn("whitespace-nowrap", UNIT[size])}>g</span>
    </span>
  );
}
