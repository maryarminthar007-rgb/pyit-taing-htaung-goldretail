# Sample Photo Workflow

## Goal
Add an optional reference photo that follows a custom order from Marketing placement through office review and into the linked goldsmith issue entry.

## What will change
- Add a dedicated sample-photo field to marketing orders and goldsmith orders.
- Add a storage bucket for order reference images with authenticated upload permissions and safe image limits.
- Extend the Marketing Place Order dialog with an optional bilingual image picker, immediate local/upload preview, replace, and remove controls.
- Add a reusable sample-photo viewer: compact thumbnail, full-screen preview, and a Download / Save Photo action suitable for saving and sharing through Viber.
- Show the thumbnail and viewer in both the marketer’s Recent Orders table and the admin Marketing Re-orders table.
- Carry the same photo automatically when an admin assigns a marketing order to a goldsmith.
- Show “Attached Sample Photo · နမူနာပုံ” inside the issue form, with View / Download plus optional upload or replacement by an admin.

## Data and security
- Store only the uploaded image URL/path on each order; the image binary stays in managed storage.
- Accept images only, enforce the existing 8 MB client limit, and grant uploads/changes only to signed-in users allowed to place or manage orders.
- Preserve existing product images separately; sample photos will never overwrite catalog photos.
- When a marketing order is assigned, copy its sample-photo reference into the newly created goldsmith order so later replacement is isolated to that work entry.

## Verification
- Place a marketing order with a sample image and confirm the preview appears before and after saving.
- Open the full-screen viewer and verify Download / Save Photo works.
- Assign the order and confirm the linked issue form displays the same image.
- Replace the image in the issue form and confirm the saved order reopens with the replacement.
- Check tablet sizing and current build/runtime diagnostics.
