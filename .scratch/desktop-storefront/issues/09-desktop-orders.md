# 09: รายการคำสั่งซื้อและรายละเอียดบนจอกว้าง

**What to build:** ลูกค้าที่เข้าสู่ระบบดูประวัติ รายละเอียด และสถานะคำสั่งซื้อของตนผ่านเมนูบัญชีในรูปแบบจอกว้างที่อ่านง่าย

**Blocked by:** 08 — ภาพรวมบัญชีและโปรไฟล์บนจอกว้าง.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] รายการคำสั่งซื้อใช้ข้อมูลของลูกค้าที่เข้าสู่ระบบและลิงก์ไปหน้ารายละเอียดที่ตรงกัน
- [ ] หน้ารายละเอียดแสดงสินค้า ยอด และสถานะตามข้อมูลจริง โดยอ่านได้บนจอกว้างและจอเล็ก
- [ ] สถานะไม่มีคำสั่งซื้อ โหลด และผิดพลาดมีข้อความและทางไปต่อที่เหมาะสม
- [ ] ชื่อเส้นทางคำสั่งซื้อใน site map กับแอปไม่ทำให้ลิงก์ที่มีอยู่เสีย

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
