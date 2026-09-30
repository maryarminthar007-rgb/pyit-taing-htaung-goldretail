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

- `viewed_at` is shared unread state; catalog orders are photo-free `shop_reorder`, while manual `custom_sample` orders require a category and private photo. Why: shared alerts and order intent stay clear.

## Order book presentation

- Keep the ledger compact and detailed fields in its dialog. Use shared calculation helpers; Scrap Gold is display-only, and running Due/Excess are one signed net. Why: tablet fit and consistent balances.
