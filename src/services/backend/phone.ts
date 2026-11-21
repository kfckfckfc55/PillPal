/**
 * Số điện thoại di động Việt Nam (hàm thuần — có unit test; cùng quy tắc với server/pb_hooks/lib/otpRules.js).
 */

/** "+84 912 345 678", "84912345678", "0912.345.678" → "0912345678"; không hợp lệ → null. */
export function normalizeVietnamPhone(input: string | null | undefined): string | null {
  let digits = (input ?? '').replace(/[^\d+]/g, '');
  if (digits.startsWith('+84')) digits = `0${digits.slice(3)}`;
  else if (digits.startsWith('84') && digits.length === 11) digits = `0${digits.slice(2)}`;
  digits = digits.replace(/\D/g, '');
  return /^0[35789]\d{8}$/.test(digits) ? digits : null;
}

/** "0912345678" → "0912 *** 678" — hiển thị trên màn hình mà không lộ đủ số. */
export function maskPhone(phone: string): string {
  return phone.length === 10 ? `${phone.slice(0, 4)} *** ${phone.slice(7)}` : '***';
}
