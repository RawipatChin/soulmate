type CallableFailure = {
  code?: unknown;
  message?: unknown;
};

export function orderFailureCode(cause: unknown): string {
  const code = (cause as CallableFailure | null)?.code;
  return typeof code === 'string' && /^[a-z-]+\/[a-z-]+$/.test(code)
    ? code
    : 'unknown';
}

export function orderFailureMessage(cause: unknown): string {
  const code = orderFailureCode(cause);
  if (code === 'functions/not-found') return 'ระบบบันทึกคำสั่งซื้อยังไม่พร้อมใน Firebase โปรเจกต์นี้ กรุณาติดต่อร้าน';
  if (code === 'functions/unauthenticated') return 'ไม่สามารถยืนยันตัวตนสำหรับสั่งซื้อได้ กรุณาลองอีกครั้ง';
  if (code === 'functions/unavailable' || code === 'functions/deadline-exceeded') return 'เชื่อมต่อระบบคำสั่งซื้อไม่ได้ กรุณาลองอีกครั้ง';
  if (code === 'functions/internal' || code === 'unknown') return 'บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง หากยังมีปัญหาให้แจ้งร้าน';
  const message = (cause as CallableFailure | null)?.message;
  return typeof message === 'string' && message.trim() && message !== 'internal'
    ? message
    : 'บันทึกคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง';
}

export function logOrderFailure(phase: string, cause: unknown): void {
  // Keep contact details, cart contents, and provider payloads out of browser logs.
  console.error('[SOULMATE Order]', { phase, code: orderFailureCode(cause) });
}
