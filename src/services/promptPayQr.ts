/** Thai QR Payment, PromptPay credit transfer to a mobile number (BOT tag 29). */
function field(id: string, value: string) {
  if (value.length > 99) throw new Error('ข้อมูล QR ยาวเกินกำหนด');
  return id + value.length.toString().padStart(2, '0') + value;
}

function crc16(value: string) {
  let crc = 0xffff;
  for (let index = 0; index < value.length; index += 1) {
    crc ^= value.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function promptPayPayload(phone: string, amountSatang: number): string {
  if (!/^0\d{9}$/.test(phone)) throw new Error('เบอร์พร้อมเพย์ไม่ถูกต้อง');
  if (!Number.isSafeInteger(amountSatang) || amountSatang <= 0) throw new Error('ยอดชำระไม่ถูกต้อง');
  const mobile = '0066' + phone.slice(1);
  const merchant = field('00', 'A000000677010111') + field('01', mobile);
  const body = field('00', '01') + field('01', '12') + field('29', merchant) +
    field('53', '764') + field('54', (amountSatang / 100).toFixed(2)) + field('58', 'TH');
  const checksumInput = body + '6304';
  return checksumInput + crc16(checksumInput);
}
