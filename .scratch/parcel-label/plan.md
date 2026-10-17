# SOULMATE parcel label plan

Status: design agreed; implementation deferred at the user's request.

## Agreed decisions

- Use the recipient name, phone, and delivery address saved on each Order in Firebase Firestore.
- Generate a SOULMATE shop label first, without a carrier barcode or carrier booking integration.
- COD Orders require an explicit admin acceptance before they enter the preparation and label queue. Receiving COD money happens later, after the carrier collects it.
- For prepaid Orders, the current `paid` outcome means the shop has received the money. It does not mean that the parcel has shipped or arrived.
- Track fulfillment separately from payment. An eligible Order can move through **พร้อมจัดเตรียม → พร้อมส่ง → ส่งแล้ว**. Printing is allowed from **พร้อมจัดเตรียม** and does not itself mark an Order as shipped.
- COD labels show item subtotal, shipping fee, and the total amount to collect on delivery. Prepaid labels prominently say **ไม่ต้องเก็บเงิน**.
- Admins may correct the Order's recipient details before dispatch and may generate a replacement label. Keep a record of label generations and identify a replacement print.
- Provide filters, multi-selection, and a from/to Order-number range for batch printing. A range previews matching eligible Orders and explains every skipped Order.
- New Order numbers follow `SM-YYYYNNNN`: the sequence restarts at `0001` each calendar year and expands beyond four sequence digits if necessary. Existing Order numbers stay unchanged.
- Start with A4 output at four labels per page in a 2 × 2 grid, with one Order per label. Allow a larger two-per-page layout if a long address or larger text requires it.
- The shop label is separate from carrier booking. Before handoff, the admin enters the COD collection amount in the carrier's own system.
- One Order ships as one physical parcel and gets one outside label. Product names and quantities belong on a separate internal packing document.
- The outside label uses the shop name, return address, and phone from the SOULMATE store settings.

## Current system findings

- `src/services/orderService.ts` stores the delivery snapshot in `order.contact` and stores `subtotalSatang`, `shippingFeeSatang`, and `totalSatang`; the last already includes shipping.
- The Order status currently covers payment/review outcomes only: `pending_payment`, `awaiting_review`, `paid`, `cancelled`, `payment_failed`, and `expired`.
- COD Orders remain `pending_payment` until an admin confirms money was received from the carrier. Requiring `paid` before label printing would block COD dispatch.
- The current default `SM-` order prefix produces `SM-` plus characters from a random document ID. The desired `SM-20260001` sequence needs a change to the order-number allocator; it is not a display-only change.
- Store settings already include `storeName`, `storeAddress`, and `contactPhone`, but the print flow must check that all three are filled in.

## Proposed workflow

1. A new prepaid Order waits for payment confirmation. A new COD Order waits for admin acceptance.
2. Payment confirmation or COD acceptance makes the Order **พร้อมจัดเตรียม**. Validate that the recipient and address are complete before allowing label generation.
3. The admin filters the fulfillment queue by status, payment method, date, or order number. They can select rows individually, select all eligible rows in the filtered result, or enter a from/to Order-number range.
4. Show a preview with selected count, eligible count, skipped count and reasons, COD totals, and recipient details. Confirm before generating the batch.
5. Generate an A4 print document in stable order-number order, four outside labels per page; `ceil(number of Orders / 4)` pages are needed. Each label includes the Order number, recipient details, sender/return details, payment message, and for COD the subtotal, shipping fee, and amount to collect. Long text must wrap without clipping; offer the larger two-per-page layout when needed.
6. Record each generated label with time, admin, Order ID, and a version of the address and COD amount used. The UI offers reprint and highlights an older label after Order details change. The browser can confirm label generation, but cannot reliably prove that paper physically printed.
7. The admin advances fulfillment to **พร้อมส่ง** after packing and to **ส่งแล้ว** after handoff to the carrier. These transitions do not change payment status. COD remains unpaid until collection is confirmed.
8. For a COD Order, the admin also books the parcel with the carrier and enters the same collection amount there. The SOULMATE label alone does not request collection from the carrier.
9. Produce a separate internal packing document with Order number, product, variant, and quantity for each selected Order. Do not put that product list on the outside label.

## Proposed data and screen changes

- Add an independent fulfillment field to each Order. Keep separate COD acceptance and payment collection records.
- Add an admin fulfillment queue or fulfillment filters alongside the existing payment/review tabs. Show payment and fulfillment badges together on each Order.
- Preserve existing Order numbers. Allocate the new annual sequence transactionally for new Orders, using the Gregorian year at `Asia/Bangkok` local time for the year change. Update the existing configurable `orderPrefix` behavior so it cannot silently override the agreed `SM-YYYYNNNN` format.
- Mixed old and new numbers remain searchable. The numeric from/to control operates on new sequential numbers; older random-suffix Orders remain selectable directly and are explicitly identified in the preview.
- Stop label generation with a clear settings error if the shop name, return address, or phone is missing.
- For recipient corrections, update the Order's delivery snapshot and retain who changed it and when. Do not silently substitute a later customer profile address.
- Recheck eligibility when a batch is generated, because an Order could be cancelled or edited after the preview opened.

## Acceptance criteria for a later implementation

- Payment and fulfillment state are visible separately. COD can be accepted and labeled before its payment is marked successful; prepaid Orders cannot be labeled until payment succeeds.
- A4 prints four readable outside labels per page, one per Order, and accurately shows the COD total including shipping or the prepaid **ไม่ต้องเก็บเงิน** message.
- Filters, row selection, and number ranges preview the exact eligible set. Cancelled, unaccepted COD, unpaid prepaid, and incomplete-address Orders are skipped with clear reasons.
- A reprint is identified, and a recipient correction makes an earlier generated label stale. Printing never automatically marks an Order as shipped.
- New Order numbers are unique and annual; older Order numbers and Orders remain accessible.
- The packing document is separate from the outside labels.
