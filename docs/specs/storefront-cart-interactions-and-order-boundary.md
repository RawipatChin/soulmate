# Storefront cart interactions and order boundary — correction spec

## Problem Statement

A visitor can open a real product, but the quantity control appears unresponsive until a package option is selected. On the cart page, quantity controls can appear before the current catalog check finishes, yet clicks during that interval do nothing. The product page still offers “Buy now” and the cart still offers checkout, sending the visitor into shipping details even though this journey is intended to stop at the cart. These behaviors make the shopping flow look broken and contradict the current scope.

## Solution

The product detail page selects the first available package when it opens, so a visitor can add the product immediately without clicking a promotion or option. The selected package, price, stock, and total are visible and remain changeable. Quantity is limited to the selected package's stock. Adding to the cart confirms the package and count. In the cart, increase, decrease, and remove actions respond immediately, including while the latest catalog check is in progress. Once catalog facts arrive, stock and price changes are shown with a correction action. The storefront stops at the cart: purchase and checkout controls do not lead to shipping details, and direct visits to the checkout route return to the cart.

## User Stories

1. As a visitor, I want an available package selected when I open a product, so that I can add it to the cart immediately without clicking a promotion.
2. As a visitor, I want to change the product quantity and package, so that the controls always give visible feedback.
3. As a visitor, I want quantity to stay within the selected package's stock, so that I cannot add more than is available.
4. As a visitor, I want choosing a package to keep my requested quantity when stock allows it, so that I do not need to set it again.
5. As a visitor, I want Add to cart to confirm the selected package and unit count, so that I know what was added.
6. As a visitor, I want cart quantity and removal controls to respond as soon as cart lines appear, so that a catalog check does not make them appear broken.
7. As a visitor, I want the cart's item count, line total, and subtotal to agree after every change, so that I can trust the displayed cart.
8. As a visitor, I want a clear checking or failed state while the cart verifies current catalog facts, so that I understand when availability is still unknown.
9. As a visitor, I want a clear way to correct changed stock or price, so that a stale line remains understandable and editable.
10. As a visitor, I want browsing and cart pages to stop before ordering, so that Buy now and checkout do not take me to shipping details in this scope.
11. As a visitor opening a checkout URL directly, I want to return to the cart, so that the unfinished ordering flow is not exposed.
12. As a visitor using a phone or keyboard, I want package, quantity, and cart controls to remain reachable and clearly named, so that the same journey works without relying on promotional elements.

## Implementation Decisions

- The existing browser cart remains the single source for line quantity, badge, and totals.
- For a product with packages, select the first active, in-stock package in catalog order on detail load. Reflect that choice in the option controls, price, stock, image, and total. If no package is available, keep Add to cart disabled. The visitor can choose another available package; changing it clamps quantity only when its stock is lower than the requested quantity.
- Cart mutations are wired before any asynchronous catalog read. Decrease and remove always work; increase works immediately and is checked against current stock when available. An invalid quantity is identified rather than silently discarded.
- Catalog validation does not replace cart lines or silently change prices. It presents explicit correction actions.
- The product detail purchase area exposes Add to cart only. Cart checkout and direct checkout navigation are unavailable while ordering remains out of scope.
- Imported template scripts must not overwrite the application-owned cart controls or navigate to shipping.

## Testing Decisions

- Use the existing browser journey seam with a published product containing packages. Test Add to cart immediately on detail load, a later package change, quantity controls, and cart quantity changes. Test that no active package with stock leaves Add to cart disabled.
- Delay the catalog response in one test and click cart controls while validation is pending. Assert visible quantity and totals, then assert the completed validation state.
- Test that product and cart pages cannot navigate to shipping through purchase controls, and that a direct checkout URL returns to the cart.
- Test at a narrow viewport and assert visible behavior rather than implementation structure. Focused cart service tests may verify stock limits.

## Out of Scope

- Shipping details, checkout, payment, order creation, and order confirmation.
- Coupon, promotion, or discount redemption.
- Account-linked cart synchronization.

## Further Notes

- This correction follows the earlier storefront browsing and cart draft. In a live catalog check, quantity stayed at 1 before package selection. After choosing a package, the detail stepper worked. On the cart page, clicks made while the catalog check was pending had no effect; the same controls worked after the check completed.
- The project's issue tracker has not been configured, so this spec is recorded locally and has not been published as a ticket.
