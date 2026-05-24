import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label,
  myanmar,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  myanmar?: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "due" | "excess" | "gold";
  icon?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-surface p-5 shadow-sm transition-all hover:shadow-md",
        tone === "gold" && "border-gold/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {myanmar && <p className="text-xs text-muted-foreground/80">{myanmar}</p>}
        </div>
        {icon && (
          <div className="rounded-lg bg-gold-soft p-2 text-gold">{icon}</div>
        )}
      </div>
      <p
        className={cn(
          "mt-4 font-display text-3xl font-semibold tabular-nums",
          tone === "due" && "text-[color:var(--due)]",
          tone === "excess" && "text-[color:var(--excess)]",
          tone === "gold" && "text-gold",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
