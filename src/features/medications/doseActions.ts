import type { DoseStatus, SideEffectTag } from '@/types/models';
import { addMinutes } from '@/utils/date';

/**
 * Quy tắc thao tác trên một cữ thuốc (hàm thuần — có unit test).
 * Không tự khuyên uống bù hay gấp đôi liều: cữ trễ nhiều chỉ hiện lời nhắc hỏi bác sĩ / dược sĩ.
 */

/** Uống sau giờ dự kiến quá số phút này → ghi là "uống trễ". */
export const TAKEN_LATE_AFTER_MINUTES = 60;
/** Trễ từ số phút này trở lên → hiện lời nhắc "Nếu không chắc có nên uống bù…". */
export const VERY_LATE_MINUTES = 120;
/** Cho phép thao tác sớm nhất trước giờ dự kiến bao nhiêu phút (tránh bấm nhầm cữ buổi tối từ sáng). */
export const ACTIONABLE_BEFORE_MINUTES = 60;
/** Các lựa chọn "Nhắc lại sau…" (phút). */
export const SNOOZE_OPTIONS = [10, 15] as const;

export interface ActionableDose {
  status: DoseStatus;
  /** ISO UTC */
  scheduledAt: string;
}

/** Cữ còn chờ thao tác và đã đủ gần giờ uống. */
export function canActOnDose(dose: ActionableDose, now: Date): boolean {
  if (dose.status !== 'pending' && dose.status !== 'snoozed') return false;
  return now.getTime() >= new Date(dose.scheduledAt).getTime() - ACTIONABLE_BEFORE_MINUTES * 60_000;
}

/** Cữ đã có thao tác của người dùng → có thể hoàn tác. */
export function canUndoDose(dose: ActionableDose): boolean {
  return dose.status === 'taken' || dose.status === 'taken_late' || dose.status === 'skipped';
}

export function minutesLate(scheduledAt: string, at: Date): number {
  return Math.floor((at.getTime() - new Date(scheduledAt).getTime()) / 60_000);
}

/** "taken" nếu uống trong vòng 60 phút sau giờ dự kiến (hoặc sớm hơn), ngược lại "taken_late". */
export function resolveTakenStatus(scheduledAt: string, takenAt: Date): 'taken' | 'taken_late' {
  return minutesLate(scheduledAt, takenAt) > TAKEN_LATE_AFTER_MINUTES ? 'taken_late' : 'taken';
}

export function isVeryLate(scheduledAt: string, at: Date): boolean {
  return minutesLate(scheduledAt, at) >= VERY_LATE_MINUTES;
}

export type LateTimeError = 'future' | 'too_early';

/** Giờ uống thực tế hợp lệ: không muộn hơn hiện tại, không sớm hơn giờ dự kiến quá 12 tiếng. */
export function validateTakenTime(scheduledAt: string, takenAt: Date, now: Date): LateTimeError | null {
  if (takenAt.getTime() > now.getTime()) return 'future';
  if (minutesLate(scheduledAt, takenAt) < -12 * 60) return 'too_early';
  return null;
}

export function snoozeUntil(now: Date, minutes: number): Date {
  return addMinutes(now, minutes);
}

/** Giờ cần uống thực tế: cữ đang được nhắc lại thì lấy giờ nhắc lại. */
export function effectiveDueAt(dose: { status: DoseStatus; scheduledAt: string; snoozeUntil: string | null }): string {
  return dose.status === 'snoozed' && dose.snoozeUntil ? dose.snoozeUntil : dose.scheduledAt;
}

export interface StockChange {
  /** Tồn kho sau khi trừ (không âm). */
  quantity: number;
  /** Lượng thực sự đã trừ (để hoàn tác cộng trả). */
  deducted: number;
}

/** Trừ một liều khỏi tồn kho, không để âm. */
export function deductStock(quantity: number, doseAmount: number): StockChange {
  const next = Math.max(0, Math.round((quantity - doseAmount) * 1000) / 1000);
  return { quantity: next, deducted: Math.round((quantity - next) * 1000) / 1000 };
}

/**
 * Chọn / bỏ chọn một phản ứng sau uống.
 * "Bình thường" loại trừ các phản ứng khác (và ngược lại).
 */
export function toggleSideEffectTag(current: readonly SideEffectTag[], tag: SideEffectTag): SideEffectTag[] {
  if (current.includes(tag)) return current.filter((item) => item !== tag);
  if (tag === 'normal') return ['normal'];
  return [...current.filter((item) => item !== 'normal'), tag];
}

export const SIDE_EFFECT_TAGS: readonly SideEffectTag[] = ['normal', 'drowsy', 'gi_upset', 'dizzy', 'other'];
