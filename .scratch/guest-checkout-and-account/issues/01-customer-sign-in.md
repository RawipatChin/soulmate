# 01: เข้าสู่ระบบ Customer account และเปิดหน้าบัญชี

**What to build:** ลูกค้าที่มีบัญชีเข้าสู่ระบบจากหน้าร้านแล้วเปิดภาพรวมบัญชีและโปรไฟล์ได้อย่างต่อเนื่อง ระบบจำหน้าที่ตั้งใจเปิด คง session หลังโหลดหน้าใหม่ และออกจากระบบได้

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Implementation:** code complete in branch `Login`; browser and Firebase Emulator verification pending.

- [ ] ผู้มาเยือนเปิดฟอร์มล็อกอินโดยตรง กรอกข้อมูลถูกต้องแล้วไป `/account` หรือกลับไปหน้าเฉพาะบัญชีที่ตั้งใจเปิดได้
- [ ] `/account` เป็นภาพรวมบัญชี และ `/account/profile` แสดงและแก้ข้อมูลของบัญชีที่เข้าสู่ระบบเท่านั้น
- [ ] หน้าเฉพาะบัญชีรอผลตรวจ session และโปรไฟล์ก่อนตัดสินใจนำทาง; โหลดหน้าใหม่แล้วยังใช้งานได้เมื่อ session ยังอยู่
- [ ] ข้อมูลล็อกอินผิด โปรไฟล์ขาดหาย อ่านโปรไฟล์ไม่ได้ หรือ Firebase ยังไม่พร้อม แสดงข้อความที่เข้าใจได้โดยไม่เปิดข้อมูลบัญชีผิดคน
- [ ] บัญชีที่ถูกระงับไม่เข้าถึงหน้าเฉพาะบัญชี; การออกจากระบบทำให้หน้าเหล่านั้นกลับไปขอเข้าสู่ระบบ
- [ ] การกดส่งซ้ำระหว่างรอไม่สร้างคำขอซ้อน และปลายทางหลังล็อกอินไม่พาผู้ใช้ไปหน้าที่ไม่มีสิทธิ์
- [ ] ตรวจเส้นทางลูกค้าผ่านเบราว์เซอร์และ Firebase Emulator โดยยึดผลที่ผู้ใช้เห็นกับสิทธิ์อ่านโปรไฟล์จริง

## Handoff verification

Typecheck and account-access tests pass. The local web server could not start because its Windows Tailwind native dependency fails to load and process spawn is denied. Firebase Emulator CLI is not installed, so the end-to-end acceptance boxes remain unchecked.
