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

export function compareOrderNumbers(a: string, b: string): number {
  const parse = (value: string) => {
    const match = /^SM-(\d{4})(\d+)$/.exec(value.trim());
    return match ? [Number(match[1]), Number(match[2])] as const : null;
  };
  const left = parse(a);
  const right = parse(b);
  if (left && right) {
    return left[0] === right[0]
      ? Math.sign(left[1] - right[1])
      : Math.sign(left[0] - right[0]);
  }
  return a.localeCompare(b, 'en');
}
