# 12: ชุมชน กิจกรรม และกฎชุมชน

**What to build:** ผู้ใช้เข้าพื้นที่ชุมชนจากหน้าร้านและเห็นโครงสำหรับกระทู้ ประสบการณ์ กิจกรรม และกฎชุมชน โดยการโพสต์หรือเข้าร่วมเปิดใช้เฉพาะเมื่อมีบริการจริง

**Blocked by:** 01 — โครงหน้าร้านจอกว้างและหน้าแรกที่นำทางได้.

**Status:** ready-for-human

**Implementation:** complete — รายการในตั๋วนี้ลงมือทำแล้ว; เหลือการตรวจรับตามที่ระบุใน [รายงานสถานะ](../../../docs/desktop-storefront-implementation-status.md).

- [ ] หน้าใช้โครงจอกว้างแยกพื้นที่พูดคุย กิจกรรม และกฎชุมชน พร้อมย่อเป็นลำดับที่อ่านได้บนมือถือ
- [ ] เนื้อหาที่ปรากฏมาจากข้อมูลจริง หรือแสดงสถานะว่าง/ยังไม่เปิดใช้ตามจริง
- [ ] ปุ่มสร้างกระทู้ แสดงความคิดเห็น หรือเข้าร่วมกิจกรรมไม่แสดงว่าใช้งานได้ถ้ายังไม่มีปลายทางทำงาน
- [ ] ผู้ใช้เข้าหน้าและกลับไปส่วนอื่นของร้านได้ด้วยเมนูและคีย์บอร์ด

## Handoff verification

Implementation and static typecheck are complete. Human browser verification remains pending because the Vite production build could not load the installed Tailwind Oxide Windows dependency and Vite hit spawn EPERM. Keep acceptance boxes unchecked until responsive layout, keyboard behavior, and real user flows are confirmed in a working browser.
