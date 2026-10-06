# 01: โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้

**What to build:** ผู้ใช้เปิดหน้าแรกบนคอมพิวเตอร์แล้วเห็นแบรนด์ เมนูหลัก บัญชี ตะกร้า พร้อมช่องค้นหาในเนื้อหาหน้าร้าน โปรโมชัน และทางเข้าสินค้าในโครงหน้าร้านร่วม พร้อมสลับกลับเป็นรูปแบบมือถือเมื่อหน้าต่างแคบลง โครงนี้เป็นตัวอย่างใช้งานจริงสำหรับหน้าฝั่งผู้ใช้อื่น

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] หน้าแรกบนจอกว้างแสดงโลโก้ เมนูหลัก บัญชี จำนวนสินค้าในตะกร้า และช่องค้นหาในหน้าร้าน และส่วนท้ายที่นำทางไปปลายทางที่มีจริง
- [ ] การค้นหาและลิงก์ไปหน้าสินค้า บัญชี และตะกร้าทำงานกับเส้นทางและสถานะเดิม
- [ ] รูปแบบใช้สี โลโก้ ภาพ และภาษาการออกแบบจาก Stitch SOULMATE โดยไม่มีโปรโมชันหรือข้อมูลสินค้าสมมติ
- [ ] ที่ขนาดจอคอมพิวเตอร์ ช่วงเปลี่ยนผ่าน และมือถือ เนื้อหาไม่ล้นแนวนอน เมนูใช้คีย์บอร์ดได้ และการใช้งานมือถือเดิมยังทำงาน


## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
