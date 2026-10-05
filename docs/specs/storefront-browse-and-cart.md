# Storefront product browsing and cart — draft spec

## Problem Statement

A visitor needs to browse the store's real products and build a cart before deciding whether to proceed further. The current project has a Firestore catalog, product detail views, and a browser cart, but their behavior is spread across imported page templates and application code. This spec defines a consistent, verifiable journey from product discovery to a usable cart. It stops at the cart.

## Solution

Any visitor, including someone without an account, can open the home page and product catalog, inspect a published product, select an available option when needed, and add it to a cart. The cart shows the selected product and option, quantity, unit price, line total, and subtotal. The visitor can change quantity or remove an item. The cart remains available after a refresh in the same browser. The interface clearly distinguishes loading, empty, unavailable, and failed states, and it never presents sample products as live inventory.

## User Stories

1. As a visitor, I want to open the store without signing in, so that I can discover products before creating an account.
2. As a visitor, I want to see only published products in the home page's product area, so that I do not mistake draft or sample products for items for sale.
3. As a visitor, I want to see only published products in the catalog, so that the list reflects the store's current offerings.
4. As a visitor, I want to see a loading state while products are fetched, so that temporary delays do not look like an empty store.
5. As a visitor, I want to see an explicit error if products cannot be loaded, so that I do not assume the store has no products.
6. As a visitor, I want to see an empty state if there are no published products, so that I understand there is currently nothing to browse.
7. As a visitor, I want each product card to show its current name, primary image or a clear image fallback, and selling price, so that I can decide which product to inspect.
8. As a visitor, I want to open a product from its card, so that I can read its details before adding it.
9. As a visitor, I want the detail page to show the product's current description, price, images, and available options, so that I can make an informed selection.
10. As a visitor, I want unavailable products or options to be identified, so that I do not try to add something the store cannot currently sell.
11. As a visitor, I want to select a required product option before adding it, so that the cart contains the exact item I chose.
12. As a visitor, I want the add-to-cart action to give immediate feedback, so that I know whether it succeeded.
13. As a visitor, I want the cart badge to reflect the total number of units, so that I can see my cart state from other store pages.
14. As a visitor, I want adding the same product and option again to increase its quantity, so that the cart does not contain duplicate lines for the same selection.
15. As a visitor, I want different options of one product to appear as separate cart lines, so that their quantities and prices remain distinct.
16. As a visitor, I want to open the cart without signing in, so that I can review my selection.
17. As a visitor, I want each cart line to show the selected product, option, unit price, quantity, and line total, so that I can check what I added.
18. As a visitor, I want to increase or decrease a cart quantity, so that I can adjust my selection.
19. As a visitor, I want to remove a cart line, so that I can discard an unwanted selection.
20. As a visitor, I want the cart subtotal and badge to update after every cart change, so that they agree with the visible lines.
21. As a visitor, I want an understandable empty-cart state after removing the last line, so that I can return to browsing.
22. As a visitor, I want my cart to remain after refreshing or navigating between pages in the same browser, so that I do not have to rebuild it.
23. As a visitor, I want a stale or no-longer-available cart selection to be identified when I revisit the cart, so that I can correct it before any later ordering flow.
24. As a visitor using a phone, I want product cards, detail controls, and cart actions to remain usable at a narrow viewport, so that I can complete this journey on mobile.
25. As a visitor using a keyboard or assistive technology, I want product links and cart controls to have clear names and focus behavior, so that I can use the same journey accessibly.

## Implementation Decisions

- The scope is the visitor journey across home, catalog, product detail, and cart. Sign-in is not required for these pages or for adding to the cart.
- Firestore is the catalog source. Public product queries request published products; imported design HTML is presentation only and must not show sample items as live products.
- The existing browser cart remains the single cart source for this scope. Its line identity is the product plus selected option, and its badge and subtotal derive from the same cart snapshot.
- Product and option availability are checked against current catalog data when rendering add-to-cart controls and when revisiting the cart. A stale cart line is shown with a clear correction path instead of silently disappearing.
- The product journey exposes loading, empty, failed, available, and unavailable states. A failed read must not be represented as an empty catalog.
- No new product or order schema is required for this scope. The existing product and option fields provide the initial catalog facts.
- This spec does not define account-linked or cross-device cart synchronization. The browser cart is confined to the current browser.

## Testing Decisions

- Use one high-level storefront journey as the primary test seam: a signed-out visitor opens the catalog, opens a product, selects an option, adds it, changes its quantity, refreshes, removes it, and sees an empty cart. Assert visible behavior and persisted cart results, not template structure or internal function calls.
- Cover published versus draft products, no published products, Firestore read failure, unavailable product or option, duplicate add, distinct options, stale cart item, and narrow-screen navigation as variations of that journey.
- The current repository has no automated storefront test suite to copy. Add a browser-level test harness when implementing this spec; focused cart behavior tests may support it if they catch cases that are impractical through the UI.
- Do not test checkout, payment, order creation, sign-in, or AI responses as part of this spec.

## Out of Scope

- Checkout, address entry, shipping, payment, order creation, and order confirmation.
- Mandatory registration or sign-in and any post-login redirect behavior.
- Account-linked cart synchronization across browsers or devices.
- AI product guidance, search ranking, advanced filtering, promotions, coupons, and reviews.
- Admin product creation or editing, except for using published catalog fixtures in tests.

## Further Notes

- Existing storefront and cart code already covers parts of this journey; implementation should close gaps and keep a single source of truth rather than duplicate cart state.
- The catalog currently shows only `active` products, while cart quantities are stored in browser storage. Stock and price can change after an item is added, so the cart must communicate stale data before any future checkout work.
- This document is a draft for the project's issue tracker. The tracker and `ready-for-agent` triage label have not been configured in this task, so it has not been published as an issue.
