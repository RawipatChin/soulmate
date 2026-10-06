# 13: ที่อยู่และรายการที่ชื่นชอบจากบัญชี

**What to build:** ลูกค้าที่เข้าสู่ระบบเปิดหัวข้อที่อยู่และรายการที่ชื่นชอบจากเมนูบัญชีได้ โดยข้อมูลจริงแสดงเมื่อมีบริการรองรับ และบริการที่ยังไม่มีแสดงสถานะตรงไปตรงมา

**Blocked by:** 08 — ภาพรวมบัญชีและโปรไฟล์บนจอกว้าง.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] ลูกค้าที่เข้าสู่ระบบไปยังหน้าที่อยู่และรายการที่ชื่นชอบจากเมนูบัญชีได้ ส่วนผู้ยังไม่เข้าสู่ระบบต้องยืนยันตัวตน
- [ ] แต่ละหน้าแสดงข้อมูลของลูกค้าจริงเมื่อระบบมีข้อมูล หรือแสดงสถานะว่าง/ยังไม่เปิดใช้ที่ชัดเจน
- [ ] ไม่มีปุ่มเพิ่ม แก้ไข ลบ หรือย้ายสินค้าไปตะกร้าที่ดูทำงานได้แต่ไม่มีบริการรองรับ
- [ ] โครงหน้าอ่านและนำทางได้ทั้งจอกว้าง จอเล็ก และคีย์บอร์ด

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
