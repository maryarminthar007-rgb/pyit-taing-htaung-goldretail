# Project Rules

## Figures and currency/gold display

- `src/components/figures.tsx` (`KPY`, `Cash`, `Grams`) is the single source for rendering
  gold and cash amounts anywhere a number must be legible at a glance. Why: it enforces the
  number-first hierarchy (large bold value, small muted unit suffix) in one place instead of
  per-page string formatting.
- `gramsToKPY()` from `src/lib/risk.tsx` returns a flat string and is reserved for compact
  inline chips and tooltips, never for summary cards or table cells.
- Gold ↔ cash conversions go through `GRAMS_PER_KYAT` (16.6 g) and `kpyToGrams()`; kyat/pe/yway
  breakdowns come from `kpyParts()` so the styled parts and the string form never disagree.
