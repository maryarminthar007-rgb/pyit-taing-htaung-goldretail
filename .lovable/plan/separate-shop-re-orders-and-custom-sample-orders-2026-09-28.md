# Separate Shop Re-orders and Custom Sample Orders

## What will change
- Keep catalog product rows as the **Shop Re-order** flow and remove sample-photo upload from that form.
- Add a prominent **+ Custom Sample Order (နမူနာအထည်အသစ်မှာရန်)** action above the catalog.
- Add a dedicated custom-order window with required item name, category/type, sample photo, classification, team, quantity, date, and remarks.
- Require a completed photo upload before a custom order can be submitted.
- Label custom entries as **Custom Sample · နမူနာအထည်** in recent orders, the admin Marketing Orders table, and the assignment window.
- Preserve the custom item name, category, remarks, classification, and reference photo when assigned into a goldsmith’s order book.

## Technical details
- Add `order_kind` (`shop_reorder` or `custom_sample`) and `item_category` fields to marketing orders, with existing rows safely defaulted to `shop_reorder`.
- Reuse the existing private sample-photo storage and secure preview/download controls.
- Keep shop re-order payloads photo-free; custom order records will have no catalog product link and must include a stored reference-photo path.
- Update live order queries and TypeScript types without changing the current shared unread notification behavior.

## Verification
- Confirm catalog product orders show no photo field and save as Shop Re-orders.
- Confirm the custom form blocks missing photos, previews uploads, and creates a clearly labeled custom order.
- Confirm admin review and goldsmith assignment retain the label, category, and photo.
- Check the medium tablet layout and current build status.
