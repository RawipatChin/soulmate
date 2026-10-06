# 06: ชำระเงินและหน้าสั่งซื้อสำเร็จบนจอกว้าง

**What to build:** ผู้ใช้กรอกข้อมูลส่งสินค้า เลือกวิธีส่งและชำระเงินที่ระบบรองรับ ตรวจสรุปยอด ยืนยันคำสั่งซื้อ และเห็นผลสำเร็จในรูปแบบจอกว้างโดยใช้พฤติกรรมสั่งซื้อเดิม

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] แบบฟอร์มและสรุปคำสั่งซื้ออ่านพร้อมกันได้บนจอกว้าง โดยยอดและรายการตรงกับตะกร้าจริง
- [ ] การตรวจข้อมูลผิดพลาดอยู่ใกล้ช่องที่เกี่ยวข้องและใช้งานผ่านคีย์บอร์ดได้
- [ ] การยืนยันใช้เฉพาะวิธีจัดส่งและชำระเงินที่ระบบรองรับจริง ไม่สร้างตัวเลือกที่ชำระไม่ได้
- [ ] ผลลัพธ์สำเร็จแสดงข้อมูลคำสั่งซื้อที่ระบบยืนยันจริง พร้อมทางไปดูคำสั่งซื้อหรือกลับไปเลือกสินค้า

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
