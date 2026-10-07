# 02: สมัคร Customer account และกู้รหัสผ่าน

**What to build:** ผู้มาเยือนสมัครบัญชีลูกค้าและเข้าสู่บัญชีได้ ส่วนเจ้าของบัญชีที่ลืมรหัสผ่านเริ่มการกู้รหัสผ่านจากหน้าล็อกอินได้

**Blocked by:** None (can start immediately).

**Status:** ready-for-human

**Implementation:** code complete in branch `Login`; browser and Firebase Emulator verification pending.

- [ ] สมัครด้วยข้อมูลที่จำเป็นแล้วได้ Customer account ที่ role เป็น `customer` และเปิดภาพรวมบัญชีได้
- [ ] ฟอร์มสาธารณะไม่รับ role จากผู้สมัคร และผู้สมัครกำหนดตนเองเป็น `admin` หรือ `super_admin` ไม่ได้
- [ ] ข้อมูลไม่ครบ รหัสผ่านยืนยันไม่ตรง อีเมลใช้แล้ว และการสร้างโปรไฟล์ล้มเหลว แสดงผลที่ตรงกับสถานะจริง
- [ ] ผู้ใช้เริ่มกู้รหัสผ่านด้วยอีเมลจากหน้าล็อกอิน และเห็นผลตอบกลับที่ไม่เปิดเผยข้อมูลบัญชีเกินจำเป็น
- [ ] การส่งฟอร์มซ้ำระหว่างรอไม่สร้างผลซ้ำ และสามารถกลับมาเข้าสู่ระบบหลังสมัครหรือกู้รหัสผ่านได้
- [ ] ตรวจการสมัคร role `customer` และการห้ามยกระดับ role ด้วย Firebase Emulator พร้อมตรวจเส้นทางฟอร์มในเบราว์เซอร์

## Handoff verification

Typecheck and account-access tests pass. Browser and Firebase Emulator acceptance remain unverified because the local web server and Emulator CLI are unavailable in this environment.

The deployed Firestore rules supplied on 2026-10-06 allow an omitted `membershipTier` or the value `Classic`, while registration sent `classic`. The registration write now omits that optional field, and the app continues to read a missing tier as `classic`. A second registration attempt with the same email and password now resumes an Auth account whose Firestore profile is missing. Verify both a new account and the previously stranded account in the browser before checking the acceptance boxes.
