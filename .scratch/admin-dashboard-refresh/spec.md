# Admin Dashboard Refresh

## Goal

Redesign only `/admin/dashboard` so staff can quickly understand paid sales and orders needing attention. Keep the shared admin sidebar and header unchanged so later phases can redesign each page independently.

## Dashboard

- Use a quiet warm-neutral surface with SOULMATE sage accents and concise Thai labels.
- Show three real order metrics for the selected period: paid revenue, pending-payment orders, and total orders.
- Show a compact paid-sales chart and period choices for today, the last 7 days, the last 30 days, and this month. Period changes update the metrics, chart, and recent-order table together.
- Show the latest orders with order number, date, customer, total, and one status. Link each order number to its detail route; provide one link to all orders.
- Remove redundant welcome/quick-action blocks, unsupported customer/product KPIs, duplicate order pipeline, and unrelated low-stock empty state.
- Support loading, empty, and failure states. Never substitute sample values for missing data.
- Stack content on narrow screens and keep table access usable on small viewports.

## Data rules

- Use `listAdminOrders()` as the dashboard data source.
- Paid revenue includes only Orders whose order status is `paid` or payment status is `successful`.
- Pending count includes only pending-payment Orders whose payment has not succeeded.
- The period filter applies to metrics, paid sales chart, and recent orders. Orders without a usable creation date are excluded from the selected period.
- Sales chart groups paid revenue by calendar day in the browser's local timezone.

## Scope

Do not alter shared admin shell, routes, or other admin pages in this phase.

## Acceptance

- Real orders populate metrics and the five-column latest-orders table.
- Paid revenue excludes unpaid/failed/expired orders; pending orders are counted separately.
- Selecting a period updates all dashboard data consistently.
- Loading, no matching orders, and data-load failures are visibly distinct.
- Desktop and mobile layouts remain readable and navigable.
