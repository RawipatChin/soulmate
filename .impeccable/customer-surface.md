# Customer admin surface

Scoped implementation record, 2026-10-18. Sources: `PRODUCT.md`, `CONTEXT.md`, `src/components/AdminCustomersPage.tsx`, `src/components/admin-customers.css`, `src/services/customerService.ts`, and the existing `AdminOrderShell` in `OrderPages.tsx` / `order-pages.css`.

## Overview

The customer directory and customer detail page use the user's confirmed minimal Apple-inspired direction within SOULMATE's existing mint admin world. Restraint comes from readable type, generous spacing, quiet table boundaries, explicit states, and direct navigation. This record applies only to this customer surface; it does not replace the global design system, reinterpret the storefront, or redesign the shared navbar or dashboard. No separate visual composition was required for this narrowly pinned direction.

The scope is read/search access to registered customer accounts, contact details, and linked order history. There are no account editing, suspension, export, segmentation, or guest identity merging controls.

## Colors

Actual scoped values below are extracted from CSS; only ink and muted are declared CSS custom properties. Other entries remain literal component values, not new global tokens.

| Role | Value | Use |
| --- | --- | --- |
| Ink | `#20362b` | Main customer text |
| Muted | `#56655c` | Supporting copy and labels |
| Surface | `#fff` | Search, controls, tables, notices |
| Control border | `#d7e0da` | Controls and contact separators |
| Table border / row divider | `#dde5df` / `#edf0ed` | Table structure |
| Table header / row hover | `#f6f8f6` / `#f8faf8` | Quiet grouping and feedback |
| Link / focus | `#285e49` / `#2d6857` | Navigation and keyboard focus |
| Selected filter | `#e2eee6` with `#28523c` text | Active status filter |
| Button hover / press | `#e9f1ec` / `#d6e8de` | Control feedback |
| Status / suspended status | `#385e47` / `#8b3f3f` | Text statuses; suspended color is applied in directory rows |
| Initial avatar | `#edf2ee` with `#42654f` text | 36px account initial |

The inherited shell supplies warm `#fbfaf8` canvas, white sidebar, mint `#a8e5cf` active navigation, and `#2d6857` accents. Berry remains part of the product identity and existing shell notification treatment; this read-only surface adds no decorative berry emphasis.

## Typography

Customer content uses `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`, 14px body text, and 1.6 line height. Page headings use `clamp(26px, 3vw, 34px)`, weight 600, line height 1.4; section headings use 18px/600. Table labels and metadata use 12px, result counts 13px. Tables and pagination use tabular numerals. Thai copy and Thai-localized dates and THB totals are preserved. Long names, email, and address text wrap; mobile search inputs use 16px text.

## Layout

Content is centered at a maximum 1280px with 40px vertical and 36px horizontal padding. Heading-to-toolbar spacing is 32px. Search is at most 480px wide and at least 48px tall. Directory rows use 18px padding; table headers use 14px by 18px. Detail contacts form three columns (`1fr 1fr 1.5fr`) with 28px gaps, followed by order history at 36px spacing.

At 700px and below, page padding becomes 24px by 16px, tools stack, contact fields become one column, result counts move below filters, and table padding becomes 12px. Wide tables scroll within their own container. The inherited shell retains its separate 1023px drawer breakpoint and 600px compact header behavior.

## Elevation & Depth

Customer content adds no shadows. Borders and soft fills separate information. The existing sidebar's subtle shadow and translucent fixed header with 16px backdrop blur remain shared shell behavior.

## Shapes

Controls use 9px corners, search 10px, and table/notice containers 12px. Initial avatars are circular. Customer buttons and selects have at least 44px height; the detail-opening icon link is 44px square. These measurements are scoped to customer content, not a claim about every inherited shell control.

## Components

- **Directory:** name/email, phone, status, signup date, and explicit detail links. Search matches name, email, or phone; status filters expose all, active, and suspended accounts. Sort supports newest signup and Thai name order. Search, status, sort, and page are URL query parameters; changing search/filter/sort resets pagination. The detail back link returns to the base directory URL.
- **Pagination:** 12 accounts per page, performed in the browser after loading registered customers and filtering/sorting. Page numbers are clamped to available results. This is not Firestore cursor pagination and does not limit the initial fetch.
- **Data boundary:** the directory queries `users` with `role == customer`. Detail rejects missing or non-customer records. History queries `orders` with the exact account `ownerUid`, newest first. Guest checkout orders remain in the order workflow; matching email or phone does not merge guest purchases into an account. History currently renders the complete fetched account history without pagination.
- **Contact detail:** email and phone are `mailto:` / `tel:` links; the default shipping address is displayed as text. Missing fields have explicit Thai fallback copy. Order history links to the existing order detail workflow and displays payment state separately from the account status.
- **States:** loading, fetch error with retry, no registered accounts, no search results with reset, missing account, and no account orders have distinct treatments. Refresh is disabled while loading. Result count uses a polite live region; errors use an alert and loading uses a status region.
- **Feedback:** customer keyboard focus uses a 2px green outline with 3px offset; search uses focus-within with 2px offset. Buttons transition background color over 140ms ease-out; reduced-motion removes that transition. Increased-contrast preference strengthens table and search borders. Selected filters use `aria-pressed`; icon-only controls have labels.

## Do's and Don'ts

- Do preserve the shared `AdminOrderShell`, SOULMATE logo, mint navigation, Thai copy, and existing order destinations.
- Do keep this surface focused on account lookup, contacts, and order history; keep unknown data explicit.
- Don't infer guest/account identity from contact details or describe the directory as a complete list of all buyers.
- Don't treat client pagination as server-side scaling or fixture verification as evidence of production Firebase permissions and data.

Inherited consistency and drift: the content repeats the shell's green focus color, pale green states, rounded forms, and quiet neutral surfaces. Customer content deliberately uses a system font while the existing shell uses Inter. The incumbent shell already mixes Material Symbols and Lucide icons and includes 36–40px controls and navigation targets, smaller than customer controls. Those shared differences were observed and left unchanged; this document does not prescribe a global repair.

Verification reported for this implementation: the synthetic `customer-browser-smoke` fixture passed search, email search, pagination, status filtering, contact/detail order linking, empty/error/retry states, and 390px document overflow checks. Screenshots covered directory at 1440px and 390px and detail at 1440px. TypeScript `--noEmit` and Vite build passed. The detector reported no findings, and finish review returned ship with no material findings. These checks used synthetic data; live authenticated Firestore access, deployed rules/indexes, and production records were not tested.
