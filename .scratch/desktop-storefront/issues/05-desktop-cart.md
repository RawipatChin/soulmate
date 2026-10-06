# 05: ตะกร้าและคูปองบนจอกว้าง

**What to build:** ผู้ใช้ทบทวนสินค้าที่เลือก ปรับจำนวน ลบสินค้า ใช้คูปองที่ระบบรองรับ และดูสรุปยอดก่อนชำระเงินได้ในโครงหน้าจอกว้าง

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] รายการสินค้าและสรุปยอดแสดงร่วมกันเมื่อพื้นที่พอ และเรียงเป็นลำดับอ่านง่ายเมื่อจอแคบ
- [ ] ปรับจำนวน ลบสินค้า และใช้คูปองแล้วข้อมูลรายการ ยอดรวม และจำนวนในเมนูร่วมตรงกัน
- [ ] ตะกร้าว่างและคูปองใช้ไม่ได้มีข้อความและทางไปต่อที่ชัดเจน
- [ ] ปุ่มไปชำระเงินยังมองเห็นและใช้งานได้ด้วยคีย์บอร์ด

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
