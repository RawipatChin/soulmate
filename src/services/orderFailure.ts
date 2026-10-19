type FirebaseFailure = {
  code?: unknown;
  message?: unknown;
};

export function orderFailureCode(cause: unknown): string {
  const code = (cause as FirebaseFailure | null)?.code;
  return typeof code === 'string' && /^(?:[a-z-]+\/)?[a-z-]+$/.test(code)
    ? code
    : 'unknown';
}

export function orderFailureMessage(cause: unknown): string {
  const code = orderFailureCode(cause);
  if (code === 'permission-denied') return 'ระบบไม่อนุญาตให้บันทึกออเดอร์ กรุณารีเฟรชหน้าแล้วลองอีกครั้ง หากยังพบปัญหาให้ติดต่อร้าน';
  if (code === 'unauthenticated') return 'ไม่สามารถยืนยันตัวตนสำหรับสั่งซื้อได้ กรุณาลองอีกครั้ง';
  if (code === 'unavailable' || code === 'deadline-exceeded') return 'เชื่อมต่อระบบคำสั่งซื้อไม่ได้ กรุณาลองอีกครั้ง';
  if (code === 'unknown') return 'บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง หากยังมีปัญหาให้แจ้งร้าน';
  const message = (cause as FirebaseFailure | null)?.message;
  return typeof message === 'string' && message.trim() && message !== 'internal'
    ? message
    : 'บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง';
}

export function logOrderFailure(phase: string, cause: unknown): void {
  // Keep contact details, cart contents, and provider payloads out of browser logs.
  console.error('[SOULMATE Order]', { phase, code: orderFailureCode(cause) });
}
