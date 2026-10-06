# 10: เกี่ยวกับเราและติดต่อเรา

**What to build:** ผู้ใช้เข้าหน้าเกี่ยวกับเราและติดต่อเราจากเมนูได้ อ่านข้อมูลแบรนด์และเลือกช่องทางติดต่อจากข้อมูล SOULMATE ที่ยืนยันแล้ว โดยฟังก์ชันที่ยังไม่มีบริการแสดงสถานะตามจริง

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] หน้าเกี่ยวกับเรามีพื้นที่เรื่องราว วิสัยทัศน์/พันธกิจ ทีมงาน และทางไปติดต่อ โดยใช้เนื้อหาที่ได้รับการยืนยันหรือระบุชัดเมื่อยังไม่มี
- [ ] หน้าติดต่อรวมช่องทาง ที่อยู่ และ FAQ เฉพาะข้อมูลที่ตรวจสอบแล้ว
- [ ] แบบฟอร์มติดต่อเปิดใช้เฉพาะเมื่อมีปลายทางรับข้อความจริง มิฉะนั้นแสดงสถานะที่เข้าใจได้
- [ ] ทั้งสองหน้าเข้าถึงจากเมนูจอกว้างและจอเล็กได้ และใช้งานผ่านคีย์บอร์ดได้

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
