/**
 * Tiện ích ngày giờ.
 * Quy ước lưu trữ: thời điểm = chuỗi ISO 8601 UTC; giờ trong ngày = "HH:mm" theo giờ địa phương;
 * ngày = "YYYY-MM-DD" theo giờ địa phương.
 */

/** Thời điểm hiện tại dạng ISO UTC. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Cộng/trừ số ngày (theo lịch địa phương, giữ nguyên giờ). */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/** Cộng/trừ số phút. */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** Ngày địa phương dạng "YYYY-MM-DD". */
export function toLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Phân tích "HH:mm" → số phút từ 00:00. Ném lỗi nếu sai định dạng. */
export function parseTimeOfDay(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    throw new Error(`Giờ không hợp lệ: "${value}" (cần dạng HH:mm)`);
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Số phút từ 00:00 → "HH:mm" (tự quay vòng trong 24 giờ). */
export function formatTimeOfDay(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  return `${pad2(Math.floor(normalized / 60))}:${pad2(normalized % 60)}`;
}

/** Tạo Date tại ngày `day` (giờ địa phương) và giờ "HH:mm". */
export function atLocalTime(day: Date, timeOfDay: string): Date {
  const minutes = parseTimeOfDay(timeOfDay);
  const result = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  result.setMinutes(minutes);
  return result;
}

/** Đầu ngày địa phương (00:00:00.000). */
export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** "YYYY-MM-DD" → Date lúc 00:00 giờ địa phương. Ném lỗi nếu sai định dạng. */
export function parseLocalDateKey(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Ngày không hợp lệ: "${value}" (cần dạng YYYY-MM-DD)`);
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
}

/** Số ngày lịch từ `from` đến `to` (bỏ qua giờ). VD: hôm nay → ngày mai = 1. */
export function differenceInCalendarDays(to: Date, from: Date): number {
  const ms = startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime();
  return Math.round(ms / 86_400_000);
}

/** Thứ 7 hoặc Chủ nhật. */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}
