/**
 * Maps Firebase Authentication error codes to user-friendly Thai messages.
 */
export function mapFirebaseAuthError(error: unknown): string {
  if (!error) return 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์ กรุณาลองใหม่อีกครั้ง';

  const err = error as { code?: string; message?: string };
  const code = err.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';

    case 'auth/email-already-in-use':
      return 'อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น';

    case 'auth/weak-password':
      return 'รหัสผ่านยังไม่ปลอดภัยเพียงพอ (ต้องมีความยาวอย่างน้อย 8 ตัวอักษร)';

    case 'auth/invalid-email':
      return 'รูปแบบอีเมลไม่ถูกต้อง';

    case 'auth/network-request-failed':
      return 'ไม่สามารถเชื่อมต่อได้ กรุณาลองอีกครั้ง';

    case 'auth/too-many-requests':
      return 'คำขอมากเกินไปเพื่อความปลอดภัย กรุณารอสักครู่แล้วลองใหม่อีกครั้ง';

    case 'auth/user-disabled':
      return 'บัญชีผู้ใช้นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ';

    case 'auth/operation-not-allowed':
      return 'ระบบยังไม่ได้เปิดใช้งานการลงทะเบียนด้วยอีเมลและรหัสผ่าน';

    case 'auth/requires-recent-login':
      return 'กรุณาเข้าสู่ระบบใหม่อีกครั้งก่อนดำเนินการต่อ';

    default:
      if (err.message && err.message.includes('Firebase configuration')) {
        return 'ระบบยังไม่ได้ระบุการตั้งค่า Firebase Authentication ในไฟล์สภาพแวดล้อม (.env)';
      }
      return 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง';
  }
}
