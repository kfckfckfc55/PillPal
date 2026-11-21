import { strings } from '@/constants/strings.vi';

/**
 * Định dạng theo kiểu Việt Nam (tự viết, không phụ thuộc Intl để kết quả giống nhau trên mọi máy):
 * giờ 24h "HH:mm", ngày "dd/MM/yyyy", số thập phân dùng dấu phẩy.
 */

function toDate(value: Date | string): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** "09:05" */
export function formatTime(value: Date | string): string {
  const date = toDate(value);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** "21/11/2026" */
export function formatDate(value: Date | string): string {
  const date = toDate(value);
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "Thứ Bảy, 21/11/2026" */
export function formatWeekdayDate(value: Date | string): string {
  const date = toDate(value);
  const weekday = strings.format.weekdays[date.getDay()] ?? '';
  return `${weekday}, ${formatDate(date)}`;
}

/** "08:00 · Thứ Ba, 24/11/2026" */
export function formatDateTime(value: Date | string): string {
  return `${formatTime(value)} · ${formatWeekdayDate(value)}`;
}

/** 1 → "1", 0.5 → "0,5" */
export function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return rounded.toString().replace('.', ',');
}

/** "1 viên", "0,5 viên" */
export function formatDoseAmount(amount: number, unit: string): string {
  return `${formatNumber(amount)} ${unit}`;
}
