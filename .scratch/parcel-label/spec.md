# SOULMATE parcel labels and fulfillment

Status: ready-for-agent

## Problem Statement

แอดมินของ SOULMATE มีชื่อ ที่อยู่ และเบอร์ผู้รับอยู่ใน Order บน Firebase Firestore แล้ว แต่ยังไม่มีทางพิมพ์ใบปะหน้าพัสดุจากข้อมูลนั้นโดยตรง รายการออเดอร์ปัจจุบันแสดงความคืบหน้าการรับเงินและตรวจสลิป จึงบอกไม่ได้ว่าออเดอร์ใดพร้อมแพ็ก พร้อมส่ง หรือส่งแล้ว โดยเฉพาะ COD ที่ยังรอรับเงินแม้ควรส่งพัสดุได้ แอดมินต้องเลือกหลายออเดอร์ ตรวจข้อมูลและยอด COD พิมพ์ A4 และจัดการการแก้ที่อยู่หรือพิมพ์ซ้ำได้โดยไม่สับสนกับสถานะรับเงิน อีกทั้งเลขออเดอร์ปัจจุบันไม่ได้เรียงเป็น `SM-20260001` ตามที่ร้านต้องการ

## Solution

เพิ่มสถานะจัดส่งที่แยกจาก Payment status ของ Order และให้แอดมินยืนยันรับ COD ก่อนออเดอร์นั้นเข้าคิวพร้อมจัดเตรียม ออเดอร์ชำระล่วงหน้าเข้าคิวเมื่อรับเงินแล้ว แอดมินกรองและเลือกออเดอร์เป็นรายการหรือช่วงเลข ดูตัวอย่างชุดที่จะพิมพ์ และสร้างใบปะหน้าของร้านบน A4 แบบ 4 ออเดอร์ต่อแผ่น ใบ COD แสดงยอดสินค้า ค่าจัดส่ง และยอดที่ขนส่งต้องเก็บ ส่วนใบชำระแล้วระบุ “ไม่ต้องเก็บเงิน” ข้อมูลผู้ส่งมาจากการตั้งค่าร้านและข้อมูลผู้รับมาจาก Order เอกสารรายการสินค้าสำหรับคนแพ็กแยกจากใบด้านนอก ระบบเก็บประวัติการสร้างใบและจัดการพิมพ์ซ้ำเมื่อแก้ที่อยู่ เลขออเดอร์ใหม่เรียงรายปีในรูป `SM-YYYYNNNN` โดยรักษาเลขเก่าไว้

## User Stories

1. As an admin, I want to see Payment status and Fulfillment status separately, so that I know whether an Order has been paid and whether its parcel is ready to send.
2. As an admin, I want a COD Order to appear as awaiting my acceptance, so that it is not printed before I check it.
3. As an admin, I want to accept a COD Order without marking its payment successful, so that collection remains due after dispatch.
4. As an admin, I want a prepaid Order to enter the preparation queue only after payment succeeds, so that I do not dispatch an unpaid Order.
5. As an admin, I want cancelled and failed Orders excluded from the preparation queue, so that I do not create labels for them.
6. As an admin, I want to see **พร้อมจัดเตรียม**, **พร้อมส่ง**, and **ส่งแล้ว** as distinct fulfillment stages, so that the packing and handoff progress is clear.
7. As an admin, I want printing a Parcel label to leave Fulfillment status unchanged, so that a print action does not falsely record carrier handoff.
8. As an admin, I want to mark an Order ready to send after packing, so that the shipping queue reflects the actual parcel.
9. As an admin, I want to mark an Order sent after handing it to the carrier, so that the shop can distinguish dispatched parcels from parcels still on site.
10. As an admin, I want to find Orders by number, recipient, date, payment type, and Fulfillment status, so that I can prepare the day's shipment quickly.
11. As an admin, I want to select individual Orders from filtered results, so that I can print only the parcels I am preparing.
12. As an admin, I want to select all eligible Orders in the current filtered result, so that I can print a batch without ticking every row.
13. As an admin, I want to select a from/to range of sequential Order numbers, so that I can print a known run of Orders.
14. As an admin, I want a batch preview with selected, eligible, and skipped counts plus reasons, so that I can catch missing or ineligible Orders before printing.
15. As an admin, I want a preview to identify older random-suffix Order numbers separately, so that I understand why they are not in a numeric range.
16. As an admin, I want the recipient name, phone, and full delivery address copied from the Order, so that the label matches the purchase being fulfilled.
17. As an admin, I want the shop name, return address, and phone on the label, so that an undeliverable parcel can return to the shop.
18. As an admin, I want a clear error when the shop's return details or recipient address is incomplete, so that I do not print an unusable label.
19. As an admin, I want a COD label to show item subtotal, shipping fee, and total to collect, so that I can enter the correct amount in the carrier's system.
20. As an admin, I want a prepaid label to say **ไม่ต้องเก็บเงิน**, so that the recipient is not charged again.
21. As an admin, I want four legible labels arranged 2 × 2 on A4, so that I can use the shop's current printer and cut the labels apart.
22. As an admin, I want a two-per-page option for exceptionally long addresses or larger text, so that no required details are cut off.
23. As an admin, I want the generated labels ordered by Order number, so that I can match the printed stack to the packing queue.
24. As an admin, I want one outside label per Order and parcel, so that each physical parcel has one clear identity.
25. As a packing worker, I want a separate internal document listing product, variant, and quantity for each selected Order, so that I can pick the right items without exposing them on the outside of the parcel.
26. As an admin, I want to correct an Order's recipient details before dispatch, so that a customer's updated delivery instructions reach the parcel.
27. As an admin, I want a corrected address to make an earlier label visibly stale, so that I do not attach the old label by mistake.
28. As an admin, I want to generate a replacement label marked as a reprint, so that I can recover from a damaged or incorrect print without creating another Order.
29. As an admin, I want to see who generated each label and when, so that I can trace reprints and corrections.
30. As an admin, I want the print action to recheck current eligibility, so that an Order cancelled or edited after preview is not printed silently.
31. As an admin, I want the COD amount on the shop label to match the amount I enter in the carrier's booking system, so that the carrier collects the correct total.
32. As a buyer, I want a new Order number in the `SM-YYYYNNNN` format, so that I can identify my purchase easily.
33. As an admin, I want the annual number sequence to restart at `0001` using the year in Thailand, so that the number identifies its year.
34. As an admin, I want existing Order numbers to remain readable and searchable, so that historical records are not lost when numbering changes.
35. As a buyer, I want my older Order to remain accessible by its existing number, so that the change does not alter my purchase history.
36. As a shop owner, I want only authorized admins to accept COD, edit delivery details, change Fulfillment status, and generate labels, so that customer data and shipping records stay controlled.

## Implementation Decisions

- The existing Order remains the source of truth for recipient details, selected payment method, item subtotal, shipping fee, and total. Use the saved delivery snapshot; do not fetch a newer Customer account address for an old Order.
- Keep Payment status independent of Fulfillment status. The existing successful payment outcome continues to mean money received. COD acceptance records a separate admin action; it must not change payment to successful. COD payment becomes successful only after collection has been confirmed.
- Model Fulfillment status with an ineligible initial state followed by **พร้อมจัดเตรียม → พร้อมส่ง → ส่งแล้ว**. Payment approval makes a prepaid Order ready to prepare; admin acceptance makes a COD Order ready to prepare. Printing is available from the preparation stage. A later stage may reprint with an explicit warning, but printing never advances the stage.
- Preserve current Order cancellation and stock-restoration semantics. A cancelled Order cannot newly enter a print batch. Legacy Orders with an unsupported schema remain visible and searchable; they do not silently become eligible for the new workflow.
- Authorize COD acceptance, recipient correction, Fulfillment status changes, and print-history writes for active admins. Firestore rules must validate allowed transitions and prevent a buyer from changing fulfillment, COD acceptance, or label history. Check permissions at the data boundary, not only in the interface.
- Recipient corrections apply to the Order's delivery snapshot before dispatch and record actor and time. Changing delivery details invalidates labels generated from an earlier snapshot. A shipped Order's address is not silently rewritten.
- The Parcel label is a shop-generated document, not a carrier waybill. It contains Order number; recipient name, phone, and full address; shop name, return address, and phone; and a conspicuous payment message. For COD it shows item subtotal, shipping fee, and `totalSatang` as the amount to collect. For prepaid it says **ไม่ต้องเก็บเงิน**.
- Require complete shop return details before label generation. Use the shop settings already maintained by the admin. Do not list products on the outside label.
- Provide an A4 print layout with four labels per page in a 2 × 2 grid. Page count is the ceiling of eligible Order count divided by four. Keep each label together, wrap long Thai addresses, avoid clipping at normal printer margins, and offer a two-per-page layout where necessary.
- Produce a separate internal packing document for the selected batch with Order number, product name, variant, and quantity. It is not printed on the outside label.
- The admin queue supports Fulfillment status, payment method, and date filters, Order search, individual selection, selection of all eligible filtered results, and a from/to numeric Order-number range. The range applies only to the new sequential format; legacy random-suffix numbers can be selected directly.
- Before generating a batch, show the exact selected and eligible Orders, skipped Orders and reasons, recipient details, and COD collection totals. Re-read the Orders and revalidate eligibility at generation time to handle cancellation or correction after preview.
- Record each label generation or reprint with admin, time, Order identity, and the address/payment snapshot or revision used. Call this a generation record rather than proof of physical printing; a browser cannot reliably know whether paper was printed. Show a reprint marker and warn when an earlier label is stale.
- Allocate new Order numbers transactionally as `SM-YYYYNNNN`, using the Gregorian year in `Asia/Bangkok` and restarting at `0001` annually. `NNNN` is a minimum width, so the sequence can exceed 9,999. Preserve all existing numbers. The order allocator and Firestore rules must both enforce the new format and its relationship to the annual counter; the current configurable prefix must not override it silently.
- One Order maps to one physical parcel and one outside label in this version. Before handing a COD parcel to a carrier, the admin separately enters the collection amount into the carrier's booking system. Generating a SOULMATE label does not book a carrier pickup or register COD with the carrier.

## Testing Decisions

- Test externally visible behavior through the highest existing seam: an emulator-backed browser flow covering buyer checkout, admin COD acceptance or prepaid payment approval, queue filtering, selection, preview, print document, correction and reprint, and fulfillment transitions. Assert what the buyer and admin can see and what Firestore persists rather than private component calls.
- Extend the existing Firestore emulator rule coverage for the same flows, especially buyer denial of admin-only writes, rejected invalid transitions, unique annual numbers under concurrent checkout, and preservation of cancellation and stock behavior. This is the data boundary of the browser flow, not a new parallel model of the feature.
- Inspect rendered A4 output at four labels per page with Thai addresses of ordinary and worst-case lengths, COD and prepaid messaging, page breaks, and the two-per-page option. The label must stay legible at print scale without clipping.
- Include edge cases: empty selection; mixed eligible/ineligible range; cancelled Order after preview; missing sender details; incomplete address; old random-suffix numbers; year rollover; sequence beyond 9,999; repeat generation; correction after generation; and a COD Order shipped while payment still awaits collection.
- Prior art is the repository's existing Firebase emulator order smoke flow, Playwright browser smoke flow, and order-domain behavior tests. Do not add tests that merely repeat implementation details.

## Out of Scope

- Carrier API integration, carrier-issued waybills, carrier barcode or tracking generation, booking or payment collection automation.
- More than one parcel per Order, split shipments, and splitting a COD amount across parcels.
- Rewriting historical Order numbers or backfilling unsupported legacy Orders into the new Fulfillment workflow without an explicit migration.
- Treating a generated print document as confirmation that the printer physically printed paper.
- Changing checkout prices, shipping-fee calculation, payment-provider behavior, or membership accounting beyond what is needed to preserve existing Order semantics.

## Further Notes

- The current admin list groups Orders by payment/review outcome. The new Fulfillment queue and badges must make a COD Order that is ready to prepare discoverable even while its Payment status remains pending.
- Current client-side checkout builds random-suffix numbers under the `SM-` prefix. Existing Firestore rules link a transaction counter only to number strings made entirely of digits. The new prefixed annual format therefore requires coordinated changes to allocation, settings behavior, and rules.
- The shop's store settings already have fields for name, address, and phone. The print flow must validate them rather than inventing sender data.
- The existing local plan for this feature records the agreed conversation decisions. This spec is the published scope for later implementation and ticket splitting.
