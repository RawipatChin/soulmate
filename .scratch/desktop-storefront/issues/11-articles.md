# 11: รายการบทความและหน้าอ่านบทความ

**What to build:** ผู้ใช้เข้าพื้นที่บทความจากหน้าร้าน ดูรายการและหมวดหมู่ แล้วเปิดหน้าอ่านบทความได้เมื่อมีเนื้อหาที่ตรวจสอบแล้ว หากยังไม่มีข้อมูลจะเห็นสถานะว่างตามจริง

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] มีเส้นทางรายการและรายละเอียดบทความที่เปิดจากเมนูและลิงก์รายการได้
- [ ] เนื้อหาและหมวดหมู่แสดงจากแหล่งข้อมูลที่มีจริง โดยไม่มีบทความหรือ health claim ที่แต่งขึ้น
- [ ] เมื่อยังไม่มีบทความหรือเปิดบทความที่ไม่พบ ผู้ใช้เห็นข้อความชัดเจนและทางกลับรายการ
- [ ] หน้าอ่านบทความมีความกว้างบรรทัดและลำดับหัวข้อที่อ่านสบายบนจอกว้างและจอเล็ก

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
