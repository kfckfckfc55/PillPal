/**
 * Đổi múi giờ (hàm thuần — có unit test).
 *
 * Hai cách nhắc thuốc khi người dùng đi sang múi giờ khác:
 * - 'local' (mặc định): theo giờ nơi đang ở — 08:00 vẫn là 08:00 trên đồng hồ hiện tại.
 * - 'keep_interval': giữ đúng khoảng cách giữa các cữ như ở múi giờ cũ —
 *   mọi giờ uống được cộng thêm độ lệch (VD từ GMT+7 sang GMT+9: 08:00 giờ cũ = 10:00 giờ mới).
 */

export type TimeZoneMode = 'local' | 'keep_interval';

export interface TimeZoneSnapshot {
  /** Tên múi giờ IANA (VD "Asia/Ho_Chi_Minh"); null nếu máy không cung cấp. */
  name: string | null;
  /** Số phút lệch so với UTC, dương về phía đông (Việt Nam = 420). */
  offsetMinutes: number;
}

export interface TimeZoneState {
  /** Múi giờ ghi nhận lần gần nhất (null = chưa từng ghi). */
  lastSeen: TimeZoneSnapshot | null;
  mode: TimeZoneMode;
  /** Múi giờ gốc dùng để giữ khoảng cách khi mode = 'keep_interval'. */
  referenceOffsetMinutes: number | null;
}

/** Độ lệch UTC hiện tại của máy (phút, dương về phía đông). */
export function offsetEastMinutes(date: Date): number {
  const offset = -date.getTimezoneOffset();
  return offset === 0 ? 0 : offset; // tránh -0
}

/** Đổi múi giờ: so theo tên nếu cả hai có tên, ngược lại so theo độ lệch. */
export function hasTimeZoneChanged(previous: TimeZoneSnapshot, current: TimeZoneSnapshot): boolean {
  if (previous.name && current.name) return previous.name !== current.name;
  return previous.offsetMinutes !== current.offsetMinutes;
}

/** Số phút cần cộng vào giờ uống (0 khi theo giờ nơi mới). */
export function scheduleShiftMinutes(state: TimeZoneState, currentOffsetMinutes: number): number {
  if (state.mode !== 'keep_interval' || state.referenceOffsetMinutes === null) return 0;
  return currentOffsetMinutes - state.referenceOffsetMinutes;
}

/** 420 → "GMT+7", 330 → "GMT+5:30", -180 → "GMT-3", 0 → "GMT". */
export function formatUtcOffset(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'GMT';
  const sign = offsetMinutes > 0 ? '+' : '-';
  const total = Math.abs(offsetMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `GMT${sign}${hours}${minutes ? `:${minutes.toString().padStart(2, '0')}` : ''}`;
}

/**
 * Trạng thái mới sau khi người dùng chọn cách nhắc.
 * Giữ như giờ cũ: múi giờ gốc là múi giờ gốc đang dùng (nếu đã giữ từ trước) hoặc múi giờ trước khi đổi.
 */
export function resolveTimeZoneChoice(
  state: TimeZoneState,
  current: TimeZoneSnapshot,
  choice: TimeZoneMode,
): TimeZoneState {
  if (choice === 'local') {
    return { lastSeen: current, mode: 'local', referenceOffsetMinutes: current.offsetMinutes };
  }
  const reference =
    state.mode === 'keep_interval' && state.referenceOffsetMinutes !== null
      ? state.referenceOffsetMinutes
      : (state.lastSeen?.offsetMinutes ?? current.offsetMinutes);
  return { lastSeen: current, mode: 'keep_interval', referenceOffsetMinutes: reference };
}
