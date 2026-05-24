## Overview

Major restructuring of the goldsmith management app: simplify dashboard to goldsmith cards, replace all photo URL fields with native file uploads (Supabase Storage), enrich goldsmith profiles with apprentice phone/specialties/portfolio, add automated Work Status panel driven by order state, link product categories to specialist goldsmiths, and split order entry into Issue vs Return phases with visible wastage formula.

## Changes

### 1. Database & Storage (single migration)

- Create public storage buckets: `goldsmith-photos`, `product-photos`, `portfolio-photos`, `gemstone-photos` with public read + authenticated write RLS.
- `goldsmiths`: add `apprentice_phone text`. Keep `work_status` but compute it automatically (drop manual toggle in UI; auto-update via trigger on `orders`).
- `products`: add `category text` (e.g. "Chains", "Rings") so we can group/list under a parent category.
- New `goldsmith_specialties` (goldsmith_id, product_id) — many-to-many for "MC Chains → list of goldsmiths".
- New `goldsmith_portfolio` (id, goldsmith_id, photo_url, caption).
- New `orders` field defaults: `wastage_per_piece numeric` (Stage 1), keep existing `wastage` as the computed total. Add `water_loss numeric`.
- Trigger on `orders`: after insert/update, recompute owning goldsmith's `work_status`:
  - busy if any order in any of their books has `issue_date IS NOT NULL` AND (`return_date IS NULL` OR `returned_qty IS NULL`).
  - available otherwise.
- RLS for new tables/buckets mirroring existing admin patterns.

### 2. Dashboard (`_authenticated.index.tsx`)

- Remove Total Due / Total Excess / Goldsmiths / Active Books stat row.
- Replace bottom table with a responsive grid of Goldsmith cards: photo, name, work-status pill, brief due/excess summary.
- Whole card is a `<Link to="/goldsmiths/$id">`.

### 3. Upload component

- New `src/components/photo-upload.tsx` — `+` button + hidden `<input type="file" accept="image/*">`, uploads to a given bucket, returns public URL. Uses `supabase.storage.from(bucket).upload()`.
- New `src/components/portfolio-uploader.tsx` for multi-image portfolio grid (uploads to `portfolio-photos`, inserts into `goldsmith_portfolio`, shows thumbnails with delete).
- Replace every "Photo URL" text input in: Goldsmiths list (new), Goldsmith edit, Products, Gemstones with `<PhotoUpload>`.

### 4. Goldsmith profile form

- New Goldsmith dialog adds: apprentice_phone, specialties multi-select (checkbox list of products), portfolio uploader (after create).
- Edit Goldsmith dialog: same fields. Remove manual busy/available switch.
- Profile page header: shows photo, name, both phones, address, auto-derived status badge, specialties chips, portfolio gallery.

### 5. Products / Categories

- Products page: group products by `category` field, show as collapsible sections (Chains, Rings, Bangles, …). Clicking a product card opens a detail panel/route `_authenticated.products.$id.tsx` listing goldsmiths with that specialty (linked via `goldsmith_specialties`).

### 6. Work Status panel

- New route `_authenticated.work-status.tsx`. Sidebar nav entry "Work Status / အလုပ်ရှိ/မရှိ".
- Two tabs (shadcn Tabs):
  - Active Work — goldsmiths with `work_status = 'busy'`, list with their open orders.
  - Available — goldsmiths with `work_status = 'available'`.
- Status comes straight from DB (kept in sync by the trigger).

### 7. Order entry — Issue vs Return

- Edit `_authenticated.goldsmiths.$id.books.$bookId.tsx` order modal:
  - Step 1 (Issue): issue_date, ordered_qty, issued_item_name, gold_quality, wastage_per_piece, issued_weight, specs.
  - Step 2 (Return) shown only when editing an existing issued row: return_date, returned_qty, returned_item_name (default copies issued), returned specs (default copies), fire_loss, water_loss, returned_weight.
  - Total wastage rendered live as `{wastage_per_piece} × {returned_qty} = {product}` and stored into `wastage`.
- Calc utility (`src/lib/calc.ts`) updated: total wastage uses `wastage_per_piece * returned_qty` when available, else falls back to existing `wastage` value; fire_loss + water_loss subtracted from net returned. Due/excess recompute unchanged otherwise.
- Row display in the book table shows the formula breakdown.

### 8. Auth/admin

- No changes to roles; `kyoukpe@gmail.com` super-admin handling preserved.

## Technical Notes

- All uploads go through the browser Supabase client to public buckets; saved file paths are public URLs.
- The auto status trigger keeps `goldsmiths.work_status` authoritative so existing queries on Dashboard / Work Status / detail page all stay consistent without client-side derivation.
- `wastage_per_piece` is the new Stage-1 input; the legacy `wastage` column becomes the computed total (kept for backward compat & to preserve existing order rows).
- Migration is additive (no destructive column drops) so existing data continues to render.

## Out of scope

- Re-skinning beyond what's needed for the new sections.
- Editing the gemstone schema beyond swapping its photo input (no current photo field — skip).
- Adding new role/permission semantics.

After approval I'll run the migration first (one tool call, awaiting confirmation), then implement all UI/component changes.
