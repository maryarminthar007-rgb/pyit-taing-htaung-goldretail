# Category List Redesign

## Scope
- Replace product image cards on Product Catalog with grouped category lists.
- Keep Add Product, search/data behavior, deletion permissions, and product-detail navigation intact.
- Replace product image cards on Place Order with grouped category lists.
- Keep search, recent orders, and the existing order form intact; clicking a product row opens that form.
- Preserve the current visual theme and ensure rows remain clear and touch-friendly on mobile.

## Technical details
- Update only the two existing page files.
- Render each category as a bordered list section with a category heading and count.
- Use accessible links for Product Catalog rows and buttons for Place Order rows.
- Remove all product-image rendering and card-grid styling from both pages.
- Add unique page metadata for both content routes.
- Verify navigation, modal opening, mobile layout, and the preview build.
