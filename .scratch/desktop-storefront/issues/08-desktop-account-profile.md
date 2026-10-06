# 08: ภาพรวมบัญชีและโปรไฟล์บนจอกว้าง

**What to build:** ลูกค้าที่เข้าสู่ระบบเห็นเมนูบัญชีและข้อมูลของตนพร้อมกันบนจอกว้าง แก้ไขข้อมูลที่ระบบรองรับและออกจากระบบได้ โดยรักษาการป้องกันข้อมูลส่วนตัว

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] ลูกค้าที่เข้าสู่ระบบเปิดภาพรวมบัญชีและโปรไฟล์ได้ ส่วนผู้ยังไม่เข้าสู่ระบบถูกส่งไปขั้นตอนยืนยันตัวตน
- [ ] เมนูบัญชีและเนื้อหาอยู่ในโครงจอกว้างที่ช่วยหาหัวข้อได้ง่าย และย่อเป็นลำดับอ่านได้บนจอเล็ก
- [ ] การแก้ไขข้อมูลส่วนตัวที่ระบบรองรับแสดงผลสำเร็จหรือผิดพลาดตามจริง
- [ ] ทางออกจากระบบทำงาน และชื่อเส้นทางโปรไฟล์ใน site map กับแอปไม่ทำให้ลิงก์ที่มีอยู่เสีย

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
