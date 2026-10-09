# Project Rules

## Figures and currency/gold display

- `src/components/figures.tsx` (`KPY`, `Cash`, `Grams`) renders legible gold/cash amounts with consistent sans-serif number/unit sizing.
- Figure primitives force `font-sans`; headings needing sans also require `font-sans`.
- Reserve `gramsToKPY()` for compact chips/tooltips, not cards or table cells.
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

## Dates

- Use `src/lib/date.ts` and `DateField`: UI is `dd/mm/yyyy`; storage and comparisons remain ISO `yyyy-mm-dd` to avoid timezone drift.

## Office gold stock

- Store office inventory separately from goldsmith deposits; use the RLS-protected atomic `update_office_gold_stock` RPC for add/set actions and existing `is_admin` permissions. Why: inventory must persist without lost concurrent additions or changing role definitions.
