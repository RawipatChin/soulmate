# 04: รายละเอียดสินค้าและการเลือกซื้อบนจอกว้าง

**What to build:** ผู้ใช้เปิดหน้าสินค้าแล้วดูภาพ รายละเอียด ตัวเลือก ราคา สต็อก และการเพิ่มลงตะกร้าได้ในโครงจอกว้าง พร้อมรักษาลิงก์เดิมเมื่อชื่อเส้นทางใน site map ต่างจากแอป

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] ภาพสินค้าและรายละเอียดการซื้ออ่านพร้อมกันได้บนจอกว้าง และจัดลำดับใหม่อย่างถูกต้องบนจอเล็ก
- [ ] ราคา สต็อก และปุ่มซื้อเปลี่ยนตามตัวเลือกที่ผู้ใช้เลือกจริง
- [ ] การเพิ่มลงตะกร้าอัปเดตจำนวนในเมนูร่วมและรักษาพฤติกรรมเดิม
- [ ] ลิงก์รายละเอียดตามรูปแบบใน site map และลิงก์เดิมของแอปนำไปยังสินค้าเดียวกันหรือเปลี่ยนทางอย่างชัดเจน

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
