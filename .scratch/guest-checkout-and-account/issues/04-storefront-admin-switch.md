# 04: สลับหน้าร้านกับหลังบ้านโดยคง session

**What to build:** ผู้ดูแลระบบที่เข้าสู่ระบบเห็นทางเข้าหลังบ้านจากหน้าร้านและกลับหน้าร้านได้โดยไม่ล็อกอินซ้ำ ขณะที่ลูกค้าทั่วไปไม่เห็นทางเข้าหรือได้สิทธิ์เพิ่ม

**Blocked by:** 03 — เข้าสู่ระบบผู้ดูแลระบบตาม role จริง.

**Status:** ready-for-human

**Implementation:** code complete in branch `Login`; responsive browser verification pending.

- [ ] ทางเข้าหลังบ้านปรากฏเฉพาะบัญชีที่มี role `admin` หรือ `super_admin` และมีสถานะอนุญาต
- [ ] การกดทางเข้าเปลี่ยนเส้นทางโดยคง Firebase session เดิม ไม่เปลี่ยน role และไม่ให้ผู้ใช้ล็อกอินซ้ำ
- [ ] ผู้ดูแลระบบกลับจากหลังบ้านไปหน้าร้านและกลับเข้าไปได้ โดยบัญชีเดิมยังอยู่
- [ ] ลูกค้าทั่วไป ผู้ไม่เข้าสู่ระบบ และบัญชีที่ role ยังโหลดไม่สำเร็จไม่เห็นทางเข้าหลังบ้าน
- [ ] การซ่อนหรือแสดงปุ่มไม่ใช่ตัวตัดสินสิทธิ์; การเปิด URL หลังบ้านโดยตรงยังผ่านการป้องกันตามตั๋ว 03
- [ ] ตรวจการสลับบนมือถือและจอกว้าง รวมทั้งหลังโหลดหน้าใหม่และหลังออกจากระบบ

## Handoff verification

Typecheck and account-access tests pass. Responsive navigation and session persistence still require browser verification once the local web server runs. Acceptance boxes remain unchecked.
