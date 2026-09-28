# Tablet layout and Issued Item combobox

## What will change
- Tighten the authenticated page shell and order-book spacing for 11.5-inch tablet/PC widths, including a denser heading, summary area, order dialog, form grid, and ledger table.
- Keep phone behavior intact while showing more information at medium screen sizes without excess scrolling.
- Load the current goldsmith’s assigned product specialties alongside the order book.
- Replace the Issued Item field with a searchable editable combobox that initially lists only those assigned specialties.
- Allow any custom item name to be typed and saved, including names not in the catalog.
- Preserve existing edit behavior and all order calculations.

## Technical details
- Add a focused reusable creatable combobox using the existing command/popover controls.
- Query `goldsmith_specialties` for the active goldsmith, then derive options from matching products.
- Apply medium-screen responsive density classes without changing business logic or database structure.
- Validate with the live tablet-sized order flow and confirm the current build remains healthy.
