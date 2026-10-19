# นำ SOULMATE ขึ้น Cloudflare Pages

คู่มือนี้ใช้กับโครงสร้างโปรเจกต์ปัจจุบัน: หน้าเว็บเป็น React/Vite และใช้ Firebase Authentication, Firestore และ Storage ต่อไป Cloudflare Pages ให้บริการเฉพาะไฟล์เว็บที่สร้างไว้ใน `dist/` ไม่ได้ย้ายข้อมูลหรือกฎ Firebase ไป Cloudflare

## วิธีที่ใช้ได้ทันที: Direct Upload

Cloudflare ไม่ให้เปลี่ยน Direct Upload project เป็น Git integration ในภายหลัง หากตั้งใจใช้ Git integration ของ Cloudflare โดยตรงในอนาคต ต้องสร้าง Pages project ใหม่ ส่วน Direct Upload project เดิมยังทำ deploy อัตโนมัติผ่าน CI และ Wrangler ได้

### 1. เตรียมเครื่องและ Firebase

- ติดตั้ง Node.js 22 รุ่นใหม่และ npm แล้วตรวจด้วย `node --version` และ `npm --version`
- มีสิทธิ์เข้าถึง Firebase project ที่ใช้งานจริงและบัญชี Cloudflare
- ที่ Firebase Console → **Project settings → General → Your apps → Web app** คัดลอก Firebase web config ของโปรเจกต์ที่จะใช้
- ตรวจว่า Firebase Authentication เปิดวิธีล็อกอินที่เว็บใช้ และ Firestore/Storage มีกฎที่ตรงกับโค้ดรุ่นที่จะ deploy การอัปโหลดเว็บขึ้น Cloudflare ไม่ได้ deploy กฎเหล่านี้

ใน PowerShell จากโฟลเดอร์ `soulmate`:

```powershell
npm ci
```

แก้ไฟล์ `.env` ที่โปรเจกต์ใช้อยู่ แล้วใส่ค่าจาก Firebase web config (Vite อ่าน `.env` ตอน build ได้):

```dotenv
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=soulmate-web-bd695.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=soulmate-web-bd695
VITE_FIREBASE_STORAGE_BUCKET=soulmate-web-bd695.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_USE_FIREBASE_EMULATORS=false
VITE_KKU_INTELSPHERE_API_KEY=
```

ตัวอย่าง `projectId` และ `authDomain` ข้างต้นอ้างอิง Firebase project ที่ระบุใน repo นี้ ให้ตรวจค่าจริงใน Firebase Console อีกครั้ง ส่วน Storage bucket ถูกกำหนดตายตัวใน `src/lib/firebase.ts` เป็น `soulmate-web-bd695.firebasestorage.app` จึงต้องใช้ Firebase project และ bucket ที่สอดคล้องกัน ค่า `VITE_KKU_INTELSPHERE_API_KEY` ใส่เฉพาะเมื่อใช้แชต KKU IntelSphere

ค่า `VITE_*` ถูกฝังใน JavaScript ตอน build และผู้เปิดเว็บดูได้ จึงห้ามใส่ service account, private key หรือรหัสผ่านในค่าเหล่านี้ ไฟล์ `.env` ถูก ignore โดย Git อยู่แล้ว

### 2. สร้างไฟล์เว็บ

```powershell
npm run lint
npm run build
```

ต้องได้โฟลเดอร์ `dist/` ที่มี `index.html` ถ้าคำสั่งไม่ผ่าน ให้แก้ข้อผิดพลาดก่อนอัปโหลด ทุกครั้งที่แก้ค่า `.env` หรือโค้ด ต้อง build ใหม่ก่อน deploy

ขั้นตอน build จะคัดลอก `stitch_soulmate_e_commerce/` เข้า `dist/` ด้วย เพราะหน้าร้านและหน้าแอดมินโหลด HTML template จากโฟลเดอร์นี้ตอน runtime ให้ตรวจว่ามี `dist/stitch_soulmate_e_commerce/` ก่อนอัปโหลดด้วย

### 3. อัปโหลดขึ้น Cloudflare

1. เข้า [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Get started** → **Drag and drop your files**
2. ตั้งชื่อโปรเจกต์ เช่น `soulmate-shop`
3. ลาก **โฟลเดอร์ `dist/`** ที่สร้างในขั้นตอนก่อนหน้าเข้าไป แล้วเลือก **Deploy site** อย่าลากทั้ง repo หรือโฟลเดอร์ `functions/`
4. เปิด URL ที่ได้รับ เช่น `https://soulmate-shop.pages.dev`

Cloudflare Pages จะให้ React Router จัดการ URL เช่น `/products`, `/checkout` และ `/admin` เมื่อรีเฟรชหน้าได้เอง ตราบใดที่ไฟล์ที่อัปโหลดไม่มี `404.html` ที่ระดับบนสุด

### 4. อนุญาตโดเมนใน Firebase Authentication

ที่ Firebase Console → **Authentication → Settings → Authorized domains** เพิ่ม hostname ของเว็บ เช่น `soulmate-shop.pages.dev` และโดเมนจริงที่จะใช้ในภายหลัง ใส่เฉพาะ hostname ไม่ต้องมี `https://` หรือ path แล้วทดสอบสมัครสมาชิก ล็อกอิน และรีเซ็ตรหัสผ่าน

คง `VITE_FIREBASE_AUTH_DOMAIN` เป็นค่าจาก Firebase web config อย่าเปลี่ยนเป็น `pages.dev` เพียงเพราะย้ายหน้าเว็บ หากในอนาคตเพิ่มการล็อกอิน OAuth แบบ redirect ต้องตั้งค่าเพิ่มตาม [คำแนะนำของ Firebase สำหรับโฮสต์อื่น](https://firebase.google.com/docs/auth/web/redirect-best-practices)

### 5. ผูกโดเมนจริง (ถ้ามี)

ในโปรเจกต์ Pages ไปที่ **Custom domains → Set up a domain** แล้วทำตามขั้นตอน DNS/การตรวจสอบโดเมนของ Cloudflare หากเป็นโดเมนหลัก (`example.com`) ต้องจัดการ nameserver ผ่าน Cloudflare; หากเป็น subdomain ให้ทำตามค่า CNAME ที่ Cloudflare แสดง หลังโดเมนใช้งานได้ เพิ่ม hostname นี้ใน Firebase Authorized domains ด้วย

### 6. ตรวจหลัง deploy

- เปิด `/`, `/products`, `/products/<slug>` และ `/admin` แล้วรีเฟรชแต่ละหน้าโดยตรง
- ทดสอบสมัครสมาชิก/ล็อกอิน/รีเซ็ตรหัสผ่านด้วยบัญชีทดสอบ
- ตรวจว่าสินค้าและรูปจาก Firestore/Storage โหลดได้
- ทดสอบ checkout ด้วยรายการทดสอบตามสถานะการชำระเงินจริงของร้าน และตรวจ order ใน Firestore; อย่าทำธุรกรรมจริงเพื่อทดสอบโดยไม่ตั้งใจ
- ตรวจ Browser Console และ Network ถ้ามี error เกี่ยวกับ Firebase หรือโดเมน

อัปเดตเว็บครั้งต่อไป: แก้โค้ด → `npm run build` → ที่ Pages เลือก **Create a new deployment** แล้วอัปโหลด `dist/` รุ่นใหม่

## ถ้าต้องการ deploy อัตโนมัติจาก GitHub

repo นี้มี `functions/` ที่รากสำหรับ **Firebase Cloud Functions** อยู่แล้ว ขณะที่ Cloudflare Pages มอง `functions/` ที่รากเป็น **Pages Functions** จึงไม่ควรเชื่อม repo นี้กับ Pages แบบ Git integration โดยตรงด้วยโครงสร้างเดิม เพราะอาจนำโค้ด Firebase Functions ไป build เป็น Cloudflare Worker หรือทำให้ deploy ล้มเหลว

ทางเลือกสำหรับระบบอัตโนมัติคือย้าย Firebase Functions ไปโฟลเดอร์ที่ไม่ชื่อ `functions/` และแก้ `firebase.json`/คำสั่ง deploy ที่อ้างถึง จากนั้นค่อยตั้ง Pages Git integration ด้วยค่า **Production branch** ตาม branch ที่ปล่อยจริง, **Build command** `npm run build`, **Build output directory** `dist`, และค่า `VITE_*` ใน **Settings → Environment variables** ทั้ง Production/Preview ตามที่ต้องใช้ อีกทางคือให้ CI build และอัปโหลดเฉพาะ `dist/` ไปยัง Direct Upload project โดยใช้ Wrangler; วิธีนี้ไม่ต้องย้าย Firebase Functions

> ปัจจุบันไฟล์ `.env` เป็นของเครื่องผู้ build เท่านั้น ถ้า Cloudflare หรือ CI เป็นผู้ build ต้องตั้งค่า `VITE_*` ที่ระบบ build นั้นด้วย ห้ามหวังว่า Pages จะอ่าน `.env` จากเครื่องเรา

## ค่าใช้จ่ายที่ควรรู้

- Cloudflare Pages ระบุว่าให้บริการได้ทุกแผน และคำขอไฟล์ static ฟรีและไม่จำกัด; คู่มือนี้อัปโหลดเฉพาะ `dist/` จึงไม่ได้สร้าง Pages Functions หรือ Workers เพิ่ม อย่างไรก็ตาม ตารางในภาพเป็นแผนเว็บไซต์/เครือข่าย Cloudflare โดยระบุ Free สำหรับงานส่วนตัวและ Pro/Business สำหรับเว็บมืออาชีพหรือธุรกิจ ควรตรวจแผนและเงื่อนไขที่เหมาะกับร้านจริงก่อนเปิดใช้งาน ส่วนการจด custom domain อาจมีค่าจดโดเมนแยกต่างหาก
- Firebase เป็นบริการที่เว็บเรียกใช้อยู่ต่อไป Firebase Authentication แบบอีเมล/รหัสผ่านไม่มีค่าใช้จ่ายตามโควต้าปกติ แต่ Firestore และ Cloud Storage มีโควต้าฟรีและอาจคิดค่าใช้จ่ายเมื่อใช้เกิน ถ้าโปรเจกต์ผูกแพ็กเกจ Blaze การใช้เกินคิดตามจริง
- เว็บนี้ใช้ Firebase Storage สำหรับภาพและไฟล์ที่ผู้ใช้ส่ง และ bucket ที่โค้ดกำหนดไว้ลงท้ายด้วย `.firebasestorage.app` ให้ตรวจ **Firebase Console → Usage and billing** และ Google Cloud Billing ของโปรเจกต์ก่อนใช้งานจริง เพราะ Storage bucket แบบนี้อาจต้องใช้ Blaze ตามเงื่อนไขปัจจุบัน
- Budget alert ของ Google Cloud แจ้งเตือนเมื่อค่าใช้จ่ายถึงระดับที่ตั้งไว้ แต่ไม่ได้หยุดการใช้บริการหรือจำกัดยอดบิล

ดังนั้นการนำเว็บขึ้น Cloudflare Pages ไม่ได้ทำให้ Firebase หยุดคิดค่าใช้จ่าย หากต้องการจำกัดความเสี่ยง ให้ตรวจแพ็กเกจและ billing account ของ Firebase project ก่อน และดูรายงานการใช้งาน Firestore/Storage หลังเปิดเว็บ

## เอกสารอ้างอิง

- [Cloudflare Pages: Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare: ราคาแผนเว็บไซต์ทั่วไป](https://www.cloudflare.com/plans/)
- [Cloudflare Pages: ราคาและข้อจำกัดของ Functions](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare Pages: React และ SPA routing](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/)
- [Cloudflare Pages: การให้บริการ SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/)
- [Cloudflare Pages: ชื่อโฟลเดอร์ Functions](https://developers.cloudflare.com/pages/functions/get-started/)
- [Cloudflare Pages: Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Cloudflare Pages: Build configuration และ environment variables](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Firebase Authentication: Authorized domains](https://firebase.google.com/docs/auth/web/email-link-auth)
