/**
 * Nội dung mã QR ghép máy (hàm thuần — có unit test).
 * Chỉ chứa chuỗi ghép dùng một lần — KHÔNG chứa địa chỉ máy chủ, số điện thoại hay thông tin cá nhân.
 */
const PREFIX = 'KEBEN-PAIR:1:';

export function buildPairingQr(token: string): string {
  return `${PREFIX}${token}`;
}

/** Đọc mã QR quét được; không phải mã của Kề Bên → null. */
export function parsePairingQr(data: string): string | null {
  const trimmed = data.trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const token = trimmed.slice(PREFIX.length);
  return /^[a-z0-9]{32,64}$/.test(token) ? token : null;
}

/** Mã 6 số người dùng gõ (cho phép khoảng trắng / gạch). */
export function normalizePairingCode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}
