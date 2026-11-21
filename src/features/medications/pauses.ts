import { strings } from '@/constants/strings.vi';
import type { MedicationPause } from '@/types/models';
import { addDays, parseLocalDateKey, startOfLocalDay, toLocalDateKey } from '@/utils/date';
import { formatDate } from '@/utils/format';

import type { PauseInput } from '@/db/repositories/pauseRepository';

/** Tạm dừng thuốc có lý do (hàm thuần — có unit test). */

export type PauseReasonPreset = 'lab_test' | 'procedure' | 'doctor_advice' | 'other';

export const PAUSE_REASON_PRESETS: readonly PauseReasonPreset[] = [
  'lab_test',
  'procedure',
  'doctor_advice',
  'other',
];

export interface PauseFormValues {
  reasonPreset: PauseReasonPreset | null;
  /** Lý do tự ghi khi chọn "Khác". */
  customReason: string;
  /** true = bắt đầu ngay; false = từ ngày `startDate`. */
  startNow: boolean;
  startDate: string;
  /** true = tự dùng lại từ ngày `resumeDate`; false = đến khi người dùng bật lại. */
  autoResume: boolean;
  resumeDate: string;
}

export type PauseFormField = 'reason' | 'startDate' | 'resumeDate';
export type PauseFormErrors = Partial<Record<PauseFormField, string>>;

export function createPauseFormValues(today: Date): PauseFormValues {
  return {
    reasonPreset: null,
    customReason: '',
    startNow: true,
    startDate: toLocalDateKey(addDays(today, 1)),
    autoResume: true,
    resumeDate: toLocalDateKey(addDays(today, 1)),
  };
}

function reasonText(values: PauseFormValues): string {
  if (values.reasonPreset === null) return '';
  if (values.reasonPreset === 'other') return values.customReason.trim();
  return strings.pauses.reasons[values.reasonPreset];
}

function safeDate(value: string): Date | null {
  try {
    return parseLocalDateKey(value);
  } catch {
    return null;
  }
}

export function validatePauseForm(values: PauseFormValues, now: Date): PauseFormErrors {
  const errors: PauseFormErrors = {};
  const copy = strings.pauses.errors;
  const reason = reasonText(values);
  if (reason.length === 0 || reason.length > 100) errors.reason = copy.reason;

  const start = values.startNow ? now : safeDate(values.startDate);
  if (!start || (!values.startNow && start.getTime() < startOfLocalDay(now).getTime())) {
    errors.startDate = copy.startDate;
  }
  if (values.autoResume) {
    const resume = safeDate(values.resumeDate);
    if (!resume || !start || resume.getTime() <= start.getTime()) errors.resumeDate = copy.resumeDate;
  }
  return errors;
}

/** Form (đã hợp lệ) → dữ liệu lưu. Bắt đầu ngay = thời điểm hiện tại; theo ngày = 00:00 ngày đó. */
export function toPauseInput(values: PauseFormValues, now: Date): PauseInput {
  const start = values.startNow ? now : parseLocalDateKey(values.startDate);
  return {
    reason: reasonText(values),
    startAt: start.toISOString(),
    endAt: values.autoResume ? parseLocalDateKey(values.resumeDate).toISOString() : null,
    autoResume: values.autoResume,
  };
}

/** Lần tạm dừng đang diễn ra hoặc sắp tới gần nhất (null nếu không có). */
export function findOpenPause(pauses: readonly MedicationPause[], now: Date): MedicationPause | null {
  const iso = now.toISOString();
  const open = pauses
    .filter((pause) => pause.deletedAt === null && (pause.endAt === null || pause.endAt > iso))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  return open[0] ?? null;
}

export function isPauseActive(pause: MedicationPause, now: Date): boolean {
  const iso = now.toISOString();
  return pause.startAt <= iso && (pause.endAt === null || pause.endAt > iso);
}

/** "Tạm dừng · Trước nội soi · dùng lại từ 25/11/2026" / "Sẽ tạm dừng từ 23/11/2026 · …". */
export function describePause(pause: MedicationPause, now: Date): string {
  const copy = strings.pauses;
  const parts = [isPauseActive(pause, now) ? copy.activeLabel : copy.upcomingLabel(formatDate(pause.startAt))];
  parts.push(pause.reason);
  parts.push(pause.endAt ? copy.resumesOn(formatDate(pause.endAt)) : copy.untilManual);
  return parts.join(' · ');
}
