# Project Rules

## Figures and currency/gold display

- `src/components/figures.tsx` (`KPY`, `Cash`, `Grams`) is the single source for rendering
  gold and cash amounts anywhere a number must be legible at a glance. Why: it enforces the
  clean sans-serif, balanced number/unit sizing in one place instead of per-page formatting.
- Those primitives force `font-sans` on themselves because `src/styles.css` sets
  `h1, h2, h3, .font-display` to the serif display face in `@layer base`; a page heading that
  must stay sans needs an explicit `font-sans` class.
- `gramsToKPY()` from `src/lib/risk.tsx` returns a flat string and is reserved for compact
  inline chips and tooltips, never for summary cards or table cells.
- Gold ↔ cash conversions go through `GRAMS_PER_KYAT` (16.6 g) and `kpyToGrams()`; kyat/pe/yway
  breakdowns come from `kpyParts()` so the styled parts and the string form never disagree.

## Order entry item selection

- `CreatableCombobox` is the reusable editable catalog selector; order issuing supplies only the active goldsmith's specialties while preserving free-text names. Why: assignments guide staff without blocking custom work.

## Order sample photos

- Order reference images live in the private `order-sample-photos` bucket; database `sample_photo_url` fields store object paths, and `SamplePhotoUpload` / `SamplePhotoViewer` are the only UI access points. Why: signed URLs keep references authenticated while supporting preview and download.

## Marketing order notifications

- `marketing_orders.viewed_at` is the shared unread marker for all admins, while a single Realtime subscription refreshes the global badge and order list. Why: opening one specific pending order clears it for everyone without leaking subscriptions.

## Order book presentation

- The ledger is a compact summary table; all issue and return details remain in the centered New/Edit dialog. Why: the core workflow must fit 11.5-inch tablet screens without horizontal scrolling.
