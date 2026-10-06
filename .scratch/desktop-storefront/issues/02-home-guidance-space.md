# 02: พื้นที่ผู้ช่วยแนะนำสินค้าบนหน้าแรก

**What to build:** ผู้ใช้เห็นพื้นที่ product guidance assistant ในส่วนแรกของหน้าแรก โดยยังเห็นโปรโมชันและทางเข้าสินค้า พื้นที่นี้รองรับการออกแบบคำถาม คำตอบ และสินค้าแนะนำในอนาคต แต่แสดงสถานะยังไม่เปิดใช้ตามจริงในรุ่นนี้

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] พื้นที่ผู้ช่วยมองเห็นได้บนจอกว้างโดยไม่เบียดการค้นหา โปรโมชัน และทางเข้าสินค้าออกจากลำดับสำคัญ
- [ ] ไม่มีปุ่มส่งที่ดูใช้งานได้แต่ไม่ทำงาน และไม่มีคำตอบหรือสินค้าแนะนำที่แต่งขึ้น
- [ ] ข้อความและโครงสถานะสอดคล้องกับขอบเขต product guidance ของ SOULMATE โดยไม่สื่อว่าเป็นคำแนะนำรักษาโรค
- [ ] พื้นที่ย่อเป็นรูปแบบที่อ่านและใช้งานได้บนจอเล็ก โดยไม่มีข้อความไทยถูกตัด

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
