# 03: รายการสินค้า ค้นหา หมวดหมู่ และตัวกรองบนจอกว้าง

**What to build:** ผู้ใช้ค้นหาและกรองรายการสินค้าที่เผยแพร่จริงได้บนหน้าจอกว้าง พร้อมเห็นกริดสินค้า จำนวนผลลัพธ์ และสถานะข้อมูลที่ชัดเจน

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] การค้นหาจากเมนูร่วมพาเข้าสู่รายการสินค้าและแสดงผลที่สัมพันธ์กับคำค้น
- [ ] หมวดหมู่ ตัวกรอง และผลลัพธ์อยู่ในโครงจอกว้างที่อ่านพร้อมกันได้ และย่อได้เมื่อหน้าต่างแคบลง
- [ ] การ์ดสินค้าใช้ชื่อ ภาพ ราคา และสถานะสินค้าจริง พร้อมลิงก์ไปหน้ารายละเอียดที่ถูกต้อง
- [ ] แยกสถานะกำลังโหลด ว่าง และผิดพลาดโดยไม่แสดงสินค้า ราคา หรือสต็อกสมมติ

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
