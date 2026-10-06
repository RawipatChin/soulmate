# 07: เข้าสู่ระบบและสมัครสมาชิกบนจอกว้าง

**What to build:** ผู้ใช้เข้าถึงหน้าเข้าสู่ระบบและสมัครสมาชิก กรอกข้อมูลและแก้ข้อผิดพลาดได้สะดวกบนจอกว้าง พร้อมกลับไปยังหน้าที่ตั้งใจเปิดหลังยืนยันตัวตนตามพฤติกรรมเดิม

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] สองหน้ามีโครงฟอร์มจอกว้างที่อ่านง่ายและมีลิงก์ไปมาระหว่างกัน
- [ ] ข้อความตรวจข้อมูลและข้อผิดพลาดจากการเข้าสู่ระบบอ่านเข้าใจและสัมพันธ์กับช่องที่กรอก
- [ ] หลังเข้าสู่ระบบ ผู้ใช้กลับไปยังหน้าที่ตั้งใจเปิดเมื่อระบบเดิมรองรับ
- [ ] การใช้งานคีย์บอร์ดและรูปแบบมือถือเดิมยังทำงาน

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
