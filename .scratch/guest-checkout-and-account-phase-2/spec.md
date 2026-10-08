# สเปก: คำสั่งซื้อและ Guest Checkout ระยะที่ 2

สถานะ: ทดสอบในเครื่องผ่านแล้ว; โปรเจ็กต์ทดสอบรอผู้ดูแลเปิดสิทธิ์ Cloud Run Invoker

แผนหลัก: [แผนบัญชี คำสั่งซื้อ และ guest checkout](../../docs/guest-checkout-and-account-plan.md)

## ขอบเขต

เพิ่มการบันทึกคำสั่งซื้อจากตะกร้า รวมถึง guest checkout โดย Order ถูกบันทึกและจองสต็อกผ่าน Cloud Functions ก่อนเริ่มชำระเงิน ใช้ค่าจัดส่งทดลอง 30 บาทต่อ Order และเปิดรับ Order ผ่าน server-side `CHECKOUT_MODE=test` เท่านั้น

## พฤติกรรมที่ต้องได้

- Cloud Function ตรวจราคา จำนวน สต็อก และข้อมูลติดต่อจากข้อมูลที่เชื่อถือได้ แล้วสร้าง `orders/{orderId}` กับการจองสต็อกใน transaction เดียวกัน
- ผู้ซื้อ guest ใช้ Firebase Anonymous Authentication และอ่านได้เฉพาะ Order ของตน; ลูกค้าอ่านประวัติของตน และ admin อ่านรายการทั้งหมดได้ตาม Firestore Rules
- การส่งคำขอซ้ำใช้ idempotency key เดิม ไม่สร้าง Order หรือจองสต็อกซ้ำ
- Order เริ่มเป็น `pending_payment` หมดอายุหลัง 30 นาที; เมื่อมี API activity ให้ตรวจ charge ที่อาจถูกสร้างแล้วก่อนปิด Order และคืนสต็อก โดยคืนได้ครั้งเดียว
- การเริ่ม PromptPay แยกจากการสร้าง Order ใช้ Omise Test Mode ผ่าน server secret และ `ref_id` คงที่; webhook ที่ตรวจสอบแล้วเป็นผู้ปรับสถานะการชำระ
- อีเมล guest ใช้เป็นข้อมูลติดต่อและป๊อปอัปสาธิตเท่านั้น ไม่มีการส่งอีเมลจริง

## ข้อจำกัดการปล่อยใช้งาน

รอบนี้ export เฉพาะการสร้างและหมดอายุ Order; ไม่เปิด Omise, QR หรือ webhook โค้ดชำระเงินเดิมเก็บไว้ในโฟลเดอร์ deferred-payment และไม่ถูก deploy

Functions ทั้งสองตัวถูกสร้างใน Firebase โปรเจกต์ทดสอบแล้ว แต่ยังเรียกจากเว็บไม่ได้เพราะบัญชี CLI ไม่มีสิทธิ์ run.services.setIamPolicy ผู้ดูแลโปรเจกต์ต้องเปิด public invoker ให้ Cloud Run services ทั้งสองตัวก่อนทดสอบ checkout กับ Firebase จริง

ไม่เปิดรับ Order ในโปรเจกต์ที่ไม่ได้ตั้ง `CHECKOUT_MODE=test` ฝั่ง server; Vite flag ใช้แสดง UI เท่านั้น Secret ของ Omise ต้องอยู่ใน Firebase Secret Manager ก่อน deploy/ทดสอบ PromptPay จริง ไม่มี Scheduled Function; Order ที่ไม่มี API activity หลังครบกำหนดอาจยังคงจองสต็อกจนกว่าจะมีคำขอครั้งถัดไป
