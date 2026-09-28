# Marketing notifications and compact order book

## Build
- Add a shared `viewed_at` marker to Marketing orders. New pending orders remain unread until any admin opens or assigns that specific order.
- Enable live Marketing-order updates so the sidebar badge and toast update immediately, without relying only on polling.
- Mark only the selected order viewed when its details/assignment window opens; assigned orders also leave the pending count.
- Replace the Goldsmith book’s wide ledger with a compact tablet-friendly summary table containing Date, Item, Purity, Status, Balance, and Actions.
- Keep every detailed issue/return value in the existing centered New/Edit window, reorganized into clear issue details, weight details, classification, and sample-photo sections.
- Verify the live badge behavior and New/Edit workflow at an 11.5-inch tablet-sized viewport.

## Technical details
- Schema: nullable `marketing_orders.viewed_at timestamptz`; existing pending orders start unread.
- Realtime: subscribe once in the sidebar and clean up on unmount; refresh shared counts and Marketing-order lists on INSERT/UPDATE/DELETE.
- Status is derived from return completion (`Available/Returned` versus `In Progress`) and balances remain visible without restoring the removed wide accounting columns.
