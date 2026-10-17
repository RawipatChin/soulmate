export function getBangkokOrderYear(now = new Date()): number {
  const year = Number(new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
  }).format(now));
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error('วันที่ไม่สามารถใช้สร้างเลขออเดอร์ได้');
  }
  return year;
}

export function formatOrderNumber(year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error('ปีของเลขออเดอร์ไม่ถูกต้อง');
  }
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error('เลขลำดับต้องเป็นจำนวนเต็มบวก');
  }
  return `SM-${year}${String(sequence).padStart(4, '0')}`;
}
