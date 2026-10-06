# 14: นโยบาย ข้อกำหนด และหน้าสถานะพิเศษ

**What to build:** ผู้ใช้เปิดหน้านโยบายความเป็นส่วนตัวและข้อกำหนดการใช้งานจากส่วนท้าย และได้รับคำอธิบายพร้อมทางกลับเมื่อหน้าไม่พบ กำลังพัฒนา หรือปิดปรับปรุง โดยใช้เอกสารและสถานะของ SOULMATE จริง

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] ส่วนท้ายเชื่อมไปหน้านโยบายและข้อกำหนดที่มีเนื้อหาที่ได้รับการยืนยัน หรือแสดงสถานะยังไม่มีเอกสารอย่างชัดเจน
- [ ] หน้าที่ไม่พบมีข้อความเข้าใจง่ายและทางกลับหน้าแรกหรือส่วนที่เกี่ยวข้อง
- [ ] หน้า coming soon และ maintenance สื่อสถานะจริง พร้อมทางไปต่อเมื่อเหมาะสม
- [ ] หน้าพิเศษใช้งานได้บนจอกว้าง จอเล็ก และคีย์บอร์ดโดยไม่ขัดกับโครงหน้าร้าน

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
