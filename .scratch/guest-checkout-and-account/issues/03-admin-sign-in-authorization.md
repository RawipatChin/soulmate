# 03: เข้าสู่ระบบผู้ดูแลระบบตาม role จริง

**What to build:** ผู้ดูแลระบบเข้าสู่ระบบด้วยบัญชี Firebase เดียวกับหน้าร้าน โดยระบบตรวจ role และสถานะบัญชีจริงก่อนเปิดหลังบ้าน พร้อมป้องกันข้อมูลที่กฎ Firestore

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Implementation:** code complete in branch `Login`; Firebase Security Rules and browser verification pending.

- [ ] ฟอร์มล็อกอินหลังบ้านไม่บังคับให้เลือก `admin` หรือ `super_admin`; บัญชีที่มี role จริงอย่างใดอย่างหนึ่งเข้าสู่หลังบ้านได้
- [ ] ลูกค้า ผู้ไม่เข้าสู่ระบบ บัญชีถูกระงับ และบัญชีที่อ่าน role ไม่ได้ ไม่เปิดหน้า admin แม้พิมพ์ URL โดยตรง
- [ ] การตรวจหน้า admin รอ session และโปรไฟล์ให้เสร็จก่อนอนุญาตหรือปฏิเสธ และแสดงเหตุผลที่เข้าใจได้เมื่อเข้าไม่ได้
- [ ] การเลือกปุ่มหรือแก้ role ฝั่งหน้าเว็บไม่เปลี่ยนสิทธิ์จริง; ลูกค้าอ่านหรือแก้ข้อมูลที่สงวนให้ admin ผ่าน Firestore โดยตรงไม่ได้
- [ ] กฎ Firestore ไม่ให้สิทธิ์ admin จากอีเมลพิเศษ และไม่ให้ลูกค้าแก้ role ของตนเอง
- [ ] บัญชี `admin` และ `super_admin` ที่ได้รับสิทธิ์จริงเข้าถึงข้อมูลตามสิทธิ์ได้โดยใช้ session เดิม
- [ ] ตรวจเส้นทางล็อกอินและ URL โดยตรงในเบราว์เซอร์ พร้อมทดสอบกฎ Firestore ด้วย Firebase Emulator สำหรับทุก role และกรณีโปรไฟล์ผิดปกติ

## Handoff verification

Typecheck and account-access tests pass. Direct Firestore permission checks still require Firebase Emulator; browser verification requires a working local web server. Acceptance boxes remain unchecked.
