# SOULMATE admin surface contract

## Scope

Redesign the operating surfaces at `/admin/login`, `/admin/products/**`, `/admin/orders/**`, `/admin/customers/**`, `/admin/banners/**`, `/admin/coupons/**`, and `/admin/settings`. Leave `/admin/dashboard` as it is.

## Confirmed operating context

- Store staff work mainly from desktop browsers.
- Order review and payment status are the highest priority; products and inventory follow.
- SOULMATE is a health and beauty supplement store. Order records include both guest and signed-in customers.
- Firestore is the source of order and payment state. Pending orders reserve stock; payment attempts are tracked separately.
- Preserve the established botanical palette, SOULMATE assets, and practical Thai-first copy.

## Locked composition: order desk

- Shared shell: stable left navigation, compact top bar, broad task area, restrained mint selection, berry used for high-intent brand cues.
- First viewport on `/admin/orders`: page title and refresh action; search field; payment status filters with live counts; the newest orders in a readable queue; selected order details beside the queue.
- Queue entries show order number, date, customer, total, and payment state. The detail pane shows payment state, method, customer, products, subtotal, shipping, and total.
- Search covers order number, customer name, phone, and email. Filters and selection update in place. A full detail route remains available for delivery information.
- Other admin routes inherit the same shell, Thai navigation labels, form rhythm, focus behavior, and responsive behavior. Order and payment data stays tied to existing services.

## Signature interaction and motion

Selecting an order updates the adjacent detail pane without a route change. Search and payment filters update the visible queue immediately. Feedback uses short 150–180 ms color/scale transitions; the explicit refresh control alone indicates loading. Reduced-motion preferences remove authored transitions and the refresh spin.

## States and constraints

- Loading, load error with retry, populated queue, no orders, and no filter matches are explicit.
- Payment status is displayed from server-backed order/payment fields. The UI must not suggest staff can manually mark a payment successful when no approved backend action exists.
- Dashboard content is outside this change. The shared shell stylesheet is injected only for non-dashboard iframe routes.
- Visual captures are available in `.impeccable/review-shots/` for login, the order desk, products, customers, banners, coupons, and settings at desktop and mobile sizes. The order desk is captured at 1440×1000 and 390×844.
- The review-shots were captured before the final visual fixes and are historical references. Live mobile verification after the fixes confirmed the order filters fit on one row, the inventory value uses a compact mobile format while preserving the full value in its title, and the settings header actions no longer overlap.
- Live product data verification showed four Firestore documents, four listed items, four published products, and matching filter totals. The mobile inventory value displayed as `฿5.8M`.
- The latest visual pass was performed at the existing 405×876 browser viewport override (390×844 page raster). The browser-control interface in this session did not expose a viewport reset or screenshot-to-file method, so the historical PNGs were not replaced.
- The signed-in test account currently has zero orders, so the queue empty state and the unselected details panel are verified. Populated order rows and selected-order details still need an authentic order record for data-backed visual review.
- Dashboard is excluded from these captures and this redesign.
