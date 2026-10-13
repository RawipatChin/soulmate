# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Store administrators use the SOULMATE back office on a computer to manage orders, payments, products, and inventory.
- Customers browse SOULMATE's health and beauty supplement catalog and can check out as guests or use a customer account.

## Product Purpose

SOULMATE is an online store for health and beauty supplements. Its back office helps the store team maintain the catalog and fulfill customer orders. The storefront also includes a product guidance assistant.

## Positioning

The product guidance assistant compares a customer's stated shopping goals with facts recorded in the published product catalog. When no available product meets all stated conditions, it identifies the unmet conditions and asks what the customer is willing to relax.

## Operating Context

The primary back-office workflow is reviewing orders and payment status, followed by managing products and stock. The store team works mainly from a desktop browser. Other back-office areas manage customers, banners, coupons, and store settings.

## Capabilities and Constraints

- Orders, products, accounts, and store operations use Firebase services, including Firestore.
- Guest checkout records the contact and delivery details needed to fulfill an order without requiring a permanent account.
- Pending orders reserve stock while payment is possible; payment attempts are tracked separately from order status.
- Product guidance must not diagnose conditions or promise health outcomes. Catalog facts support recommendations only when they are actually recorded and the product is published, purchasable, and in stock.
- The requested redesign covers the admin surfaces other than the dashboard, which the user has already updated.

## Brand Commitments

- Preserve the SOULMATE name, existing logo assets, Thai-language storefront copy, and the established mint-green and berry accent palette.
- The user requested Apple's interface design principles for the admin redesign. This is scoped to this admin work and does not redefine the entire storefront brand.

## Evidence on Hand

- Existing product guidance and domain terminology: `CONTEXT.md`.
- Existing visual identity reference: `stitch_soulmate_e_commerce/modern_botanical_wellness/DESIGN.md`.
- Admin route templates and screenshots: `stitch_soulmate_e_commerce/soulmate_admin_*/` and `stitch_soulmate_e_commerce/soulmate_super_admin_*/`.
- The admin dashboard already has a current implementation and is excluded from this redesign.

## Product Principles

- Make order and payment review quick to scan.
- Keep inventory and fulfillment states explicit and trustworthy.
- Preserve direct access to the existing admin workflows.
- Ground health and beauty product guidance in the recorded catalog.
